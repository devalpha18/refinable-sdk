/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TransactionResponse } from "@ethersproject/abstract-provider";
import {
  ContractTypes,
  CreateOfferForEditionsMutation,
  CreateOfferForEditionsMutationVariables,
  OfferType,
  Price,
  TokenType,
} from "../@types/graphql";
import { CREATE_OFFER } from "../graphql/sale";
import { SaleOffer } from "../offer/SaleOffer";
import { Refinable } from "../Refinable";
import { AbstractNFT, PartialNFTItem } from "./AbstractNFT";
import { optionalParam } from "../utils/utils";
import { ethers } from "ethers";
import { getUnixEpochTimeStampFromDate } from "../utils/time";

export class ERC721NFT extends AbstractNFT {
  constructor(refinable: Refinable, item: PartialNFTItem) {
    super(TokenType.Erc721, refinable, item);
  }

  async approve(operatorAddress: string): Promise<TransactionResponse> {
    const nftTokenContract = await this.getTokenContract();

    // TODO: we should actually use this but our contracts do not support it
    // return this.nftTokenContract.approve(operatorAddress, this.item.tokenId);
    return nftTokenContract.setApprovalForAll(operatorAddress, true);
  }

  async isApproved(operatorAddress: string) {
    const nftTokenContract = await this.getTokenContract();

    // TODO: we should actually use this but our contracts do not support it
    // const approvedSpender = await this.nftTokenContract.getApproved(this.item.tokenId);
    const isApprovedForAll = await nftTokenContract.isApprovedForAll(
      this.refinable.accountAddress,
      operatorAddress
    );

    // return approvedSpender.toLowerCase() === operatorAddress.toLowerCase() || isApprovedForAll;
    return isApprovedForAll;
  }

  async buy(
    signature: string,
    price: Price,
    ownerEthAddress: string,
    royaltyContractAddress?: string
  ): Promise<TransactionResponse> {
    this.verifyItem();
    const saleContract = await this.refinable.contracts.getRefinableContract(
      this.item.chainId,
      this.saleContract.address,
      [ContractTypes.Erc721Sale]
    );
    await this.isValidRoyaltyContract(royaltyContractAddress);
    const isDiamondContract = saleContract.hasTagSemver("SALE", ">=4.0.0");

    const priceWithServiceFee = await this.getPriceWithBuyServiceFee(
      price,
      this.saleContract.address,
      [ContractTypes.Erc721Sale]
    );

    await this.approveForTokenIfNeeded(
      priceWithServiceFee,
      this.saleContract.address
    );

    const paymentToken = this.getPaymentToken(price.currency);
    const isNativeCurrency = this.isNativeCurrency(price.currency);
    const value = this.parseCurrency(
      price.currency,
      priceWithServiceFee.amount
    );

    const result = await this.saleContract.buy(
      // address _token
      this.item.contractAddress,
      // address _royaltyToken,
      ...optionalParam(
        !isDiamondContract,
        royaltyContractAddress ?? ethers.constants.AddressZero
      ),
      // uint256 _tokenId
      this.item.tokenId,
      // address _payToken
      paymentToken,
      // address payable _owner
      ownerEthAddress,
      // bytes memory _signature
      signature,
      // If currency is native, send msg.value
      ...optionalParam(isNativeCurrency, {
        value,
      })
    );

    return result;
  }

  async putForSale(
    price: Price,
    supply: number = 1,
    launchpadDetails?: {
      vipStartDate: Date;
      privateStartDate: Date;
      publicStartDate: Date;
    }
  ): Promise<SaleOffer> {
    this.verifyItem();
    const addressForApproval = this.transferProxyContract.address;

    await this.approveIfNeeded(addressForApproval);

    const saleParamsHash = await this.getSaleParamsHash(
      price,
      this.refinable.accountAddress
    );

    const signedHash = await this.refinable.personalSign(
      saleParamsHash as string
    );

    if (launchpadDetails) {
      const saleInfoResponse = await this.saleContract.setSaleInfo(
        // address _token
        this.item.contractAddress,
        // uint256 _tokenId
        this.item.tokenId,
        // uint256 vip sale date
        getUnixEpochTimeStampFromDate(launchpadDetails.vipStartDate),
        // uint256 private sale date
        getUnixEpochTimeStampFromDate(launchpadDetails.privateStartDate),
        // uint256 public sale date
        getUnixEpochTimeStampFromDate(launchpadDetails.publicStartDate)
      );
      await saleInfoResponse.wait(this.refinable.options.waitConfirmations);
    }

    const result = await this.refinable.apiClient.request<
      CreateOfferForEditionsMutation,
      CreateOfferForEditionsMutationVariables
    >(CREATE_OFFER, {
      input: {
        tokenId: this.item.tokenId,
        signature: signedHash,
        type: OfferType.Sale,
        contractAddress: this.item.contractAddress,
        price: {
          currency: price.currency,
          amount: parseFloat(price.amount.toString()),
        },
        supply: 1,
        ...(launchpadDetails && {
          launchpadDetails: {
            vipStartDate: launchpadDetails.vipStartDate,
            privateStartDate: launchpadDetails.privateStartDate,
            publicStartDate: launchpadDetails.publicStartDate,
          },
        }),
      },
    });

    return this.refinable.createOffer<OfferType.Sale>(
      { ...result.createOfferForItems, type: OfferType.Sale },
      this
    );
  }

  async transfer(
    ownerEthAddress: string,
    recipientEthAddress: string
  ): Promise<TransactionResponse> {
    const nftTokenContract = await this.getTokenContract();

    // the method is overloaded, generally this is the one we want to use
    return nftTokenContract["safeTransferFrom(address,address,uint256)"](
      ownerEthAddress,
      recipientEthAddress,
      this.item.tokenId
    );
  }

  async burn(): Promise<TransactionResponse> {
    const nftTokenContract = await this.getTokenContract();

    return nftTokenContract.burn(this.item.tokenId);
  }
}
