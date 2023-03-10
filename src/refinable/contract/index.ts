import { ContractTypes } from "../../@types/graphql";
import { ValueOf } from "../interfaces/types";
import { Erc1155WhitelistContract } from "./Erc1155WhitelistContract";
import { Erc721LazyMintContract } from "./Erc721LazyMintContract";
import { Erc721WhitelistContract } from "./Erc721WhitelistContract";

export const CONTRACTS_MAP = {
  [ContractTypes.Erc721WhitelistedToken as const]: Erc721WhitelistContract,
  [ContractTypes.Erc1155WhitelistedToken as const]: Erc1155WhitelistContract,
  [ContractTypes.Erc721LazyMintToken as const]: Erc721LazyMintContract,
};

export type DeployableContracts = ValueOf<typeof CONTRACTS_MAP>;
