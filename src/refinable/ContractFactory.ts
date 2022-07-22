import { ContractFactory as EthersContractFactory } from "ethers";
import omit from "lodash/omit";
import { z } from "zod";
import {
  ContractTypes,
  CreateCollectionMutation,
  CreateCollectionMutationVariables,
  TokenType
} from "../@types/graphql";
import { getContractAddress } from "../config/contracts";
import { ipfsUrl, SIGNERS } from "../config/sdk";
import { CREATE_COLLECTION } from "../graphql/collections";
import EvmTransaction from "../transaction/EvmTransaction";
import { CONTRACTS_MAP, DeployableContracts as DeployableContractsClasses } from "./contract";
import { Contract, IContract } from "./contract/Contract";
import { Erc1155WhitelistContract } from "./contract/Erc1155WhitelistContract";
import { Erc721LazyMintContract } from "./contract/Erc721LazyMintContract";
import { Erc721WhitelistContract } from "./contract/Erc721WhitelistContract";
import { CreateCollectionParams } from "./interfaces/Contracts";
import { Refinable } from "./Refinable";

export class ContractFactory {
  constructor(private readonly refinable: Refinable) {}

  static getContract(contract: IContract) {
    const ContractClass = CONTRACTS_MAP[contract.type] ?? Contract;

    return new ContractClass(contract);
  }

  /**
   * Deploy a new Whitelisted contract
   */
  public createWhitelistContract(
    type: TokenType.Erc721 | TokenType.Erc1155,
    params: CreateCollectionParams<
      | z.input<typeof Erc1155WhitelistContract["deployArgsSchema"]>
      | z.input<typeof Erc721WhitelistContract["deployArgsSchema"]>
    >
  ) {
    const contractType =
      type === TokenType.Erc721
        ? ContractTypes.Erc721WhitelistedToken
        : ContractTypes.Erc1155WhitelistedToken;
    return this.createCollection(contractType, params);
  }

  /**
   * Deploy a new Lazy contract
   */
  public createLazyTokenContract(
    type: TokenType.Erc721,
    params: CreateCollectionParams<
      z.input<typeof Erc721LazyMintContract["deployArgsSchema"]>
    >
  ) {
    return this.createCollection(ContractTypes.Erc721LazyMintToken, params);
  }

  private async createCollection<C extends DeployableContractsClasses>(
    type: C["type"],
    params: CreateCollectionParams<z.input<C["deployArgsSchema"]>>
  ) {
    const chainId = await this.refinable.provider.getChainId();

    // 1. Deploy contract
    const { contract, contractAbi } = await this.deploy<C>(chainId, type, {
      ...params.contractArguments,
      symbol: params.symbol,
      name: params.name,
    });
    const deployTx = new EvmTransaction(contract.deployTransaction);

    await deployTx.wait();

    // 2. Register contract
    const { id: contractId, contract: registeredContract } =
      await this.refinable.evm.contracts.registerContract(
        chainId,
        type,
        contract.address,
        JSON.stringify(contractAbi)
      );

    // 3. Upload banner and avatar
    if (
      !(typeof params.avatar === "string") &&
      !(typeof params.avatar === "undefined")
    ) {
      params.avatar = await this.refinable.uploadFile(params.avatar);
    }
    if (
      !(typeof params.banner === "string") &&
      !(typeof params.banner === "undefined")
    ) {
      params.banner = await this.refinable.uploadFile(params.banner);
    }

    // 4. Create collection
    const { createCollection: createdCollection } =
      await this.refinable.apiClient.request<
        CreateCollectionMutation,
        CreateCollectionMutationVariables
      >(CREATE_COLLECTION, {
        data: {
          ...omit(params, "contractArguments"),
          avatar: params.avatar as string,
          banner: params.banner as string,
          tokenType: registeredContract.getTokenType(),
          contractId,
          chainId,
          contractAddress: registeredContract.contractAddress,
        },
      });

    return {
      tx: deployTx,
      contract: registeredContract,
      collection: createdCollection,
    };
  }

  private async deploy<C extends DeployableContractsClasses>(
    chainId: number,
    type: C["type"],
    contractArguments: z.input<C["deployArgsSchema"]>
  ) {
    const artifacts = await this.getDeployArtifacts(type);

    const factory = new EthersContractFactory(
      artifacts.abi,
      artifacts.bytecode,
      this.refinable.provider
    );

    const deployArgs = this.getDeployArgs(type, contractArguments, chainId);

    const contract = await factory.deploy(...deployArgs);

    await contract.deployed();

    return { contract, contractAbi: artifacts.abi };
  }

  private getDeployArgs<C extends DeployableContractsClasses>(
    type: C["type"],
    contractArguments: z.input<C["deployArgsSchema"]>,
    chainId: number
  ) {
    const ipfsUri = ipfsUrl[this.refinable.options.environment];
    const signerAddress = SIGNERS[this.refinable.options.environment];
    const refinableServiceFee = getContractAddress(
      chainId,
      ContractTypes.ServiceFeeV2
    );
    const erc721NonceHolder = getContractAddress(
      chainId,
      ContractTypes.Erc721SaleNonceHolder
    );

    switch (type) {
      case ContractTypes.Erc721WhitelistedToken:
      case ContractTypes.Erc1155WhitelistedToken:
        const whitelistArgs =
          Erc1155WhitelistContract.deployArgsSchema.parse(contractArguments);
        return [
          whitelistArgs.name,
          whitelistArgs.symbol,
          this.refinable.accountAddress,
          signerAddress,
          whitelistArgs.uri ?? ipfsUri, // uri
        ];
      case ContractTypes.Erc721LazyMintToken:
        const args =
          Erc721LazyMintContract.deployArgsSchema.parse(contractArguments);
        return [
          args.name,
          args.symbol,
          args.placeholderTokenURI,
          args.tokenMintLimit,
          args.saleSettings,
          args.royalties,
          refinableServiceFee, // service fee proxy
          signerAddress, // signer
          erc721NonceHolder, // nonce holder 721
        ];
    }
  }

  private async getDeployArtifacts<C extends DeployableContractsClasses>(
    type: C["type"]
  ): Promise<{ abi: unknown[]; bytecode: string }> {
    switch (type) {
      case ContractTypes.Erc721WhitelistedToken:
        return import("../artifacts/ERC721WhitelistedV3.json");
      case ContractTypes.Erc1155WhitelistedToken:
        return import("../artifacts/ERC1155WhitelistedV3.json");
      case ContractTypes.Erc721LazyMintToken:
        return import("../artifacts/ERC721LazyMintToken.json");
      default:
        throw new Error("Contract type not deployable");
    }
  }
}
