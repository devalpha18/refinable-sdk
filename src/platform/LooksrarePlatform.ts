import { splitSignature } from "ethers/lib/utils";
import { PartialOffer } from "../offer/Offer";
import { AbstractPlatform } from "./AbstractPlatform";
import { LooksRare } from "@refinableco/reservoir-sdk";
import { Types as LookrareTypes } from "@refinableco/reservoir-sdk/dist/looks-rare";
import { BytesEmpty } from "@refinableco/reservoir-sdk/dist/utils";
import { Types } from "@refinableco/reservoir-sdk/dist/looks-rare";
import {
  ListApproveStatus,
  ListCreateStatus,
  ListSignStatus,
  ListStatus,
  LIST_STATUS_STEP,
} from "../nft/interfaces/SaleStatusStep";
import { MutationLooksrareListForSaleArgs, Platform } from "../@types/graphql";
import axios from "axios";
import { gql } from "graphql-request";

export const LOOKSRARE_LIST_FOR_SALE = gql`
  mutation looksrareListForSale($input: LooksrareListForSaleInput!) {
    looksrareListForSale(input: $input)
  }
`;

export class LooksrarePlatform extends AbstractPlatform {
  getApprovalAddress(chainId: number): string {
    return LooksRare.Addresses.Exchange[chainId];
  }
  buy(offer: PartialOffer, contractAddress: string, tokenId: string) {
    const { v, r, s } = splitSignature(offer.orderParams.signature);

    const exchange = new LooksRare.Exchange(1);
    const order = new LooksRare.Order(1, {
      ...offer.orderParams,
      collection: contractAddress,
      tokenId: tokenId,
      v,
      r,
      s,
      kind: "single-token",
      params: [],
    });
    const unsignedTx = exchange.fillOrderTx(
      this.refinable.accountAddress,
      order,
      {
        isOrderAsk: false,
        taker: this.refinable.accountAddress,
        price: offer.orderParams.price,
        tokenId: tokenId,
        minPercentageToAsk: offer.orderParams.minPercentageToAsk,
        params: BytesEmpty,
      }
    );

    return unsignedTx;
  }

  /**
   * 1: stands for chain id (Ethereum)
   */
  async listForSale(
    nft,
    orderParams: Types.MakerOrderParams,
    options: {
      onProgress?: <T extends ListStatus>(status: T) => void;
      onError?: (
        {
          step,
          platform,
        }: { step: LIST_STATUS_STEP; platform: Platform.Looksrare },
        error
      ) => void;
    }
  ) {
    // approve
    options.onProgress<ListApproveStatus>({
      platform: Platform.Looksrare,
      step: LIST_STATUS_STEP.APPROVE,
      data: {
        addressToApprove: LooksRare.Addresses.TransferManagerErc721[1],
      },
    });
    // Approve the transfer manager
    await nft.approveIfNeeded(LooksRare.Addresses.TransferManagerErc721[1]);

    // sign
    const nonce = await this.getNonce(orderParams.signer);

    const order = new LooksRare.Order(1, {
      // looksrare params
      ...orderParams,
      nonce,

      // reservoir specific params
      kind: "single-token",
    } as LookrareTypes.MakerOrderParams);
    options.onProgress<ListSignStatus>({
      platform: Platform.Looksrare,
      step: LIST_STATUS_STEP.SIGN,
      data: {
        hash: order.getSignatureData().value,
        what: "Looksrare order",
      },
    });
    const signature = await this.refinable.account.sign(
      order.getSignatureData()
    );

    const { r, s, v, kind, ...strippedOrderParams } = order.params;

    // create
    const input = { ...strippedOrderParams, signature };
    options.onProgress<ListCreateStatus>({
      platform: Platform.Looksrare,
      step: LIST_STATUS_STEP.CREATE,
    });
    const response = await this.refinable.graphqlClient.request<
      string,
      MutationLooksrareListForSaleArgs
    >(LOOKSRARE_LIST_FOR_SALE, {
      input,
    });

    return response;
  }

  private async getNonce(makerAddress: string) {
    // TODO: We should only use LooksRare's nonce when cross-posting to their orderbook
    const nonce = await axios
      .get(
        `https://api.looksrare.org/api/v1/orders/nonce?address=${makerAddress}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then(({ data }: { data: { data: string } }) => data.data);
    return nonce;
  }
}
