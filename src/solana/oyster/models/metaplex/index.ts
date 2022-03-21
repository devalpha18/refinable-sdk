import {
  Auction,
  AuctionExtended,
  BidderMetadata,
} from "@metaplex-foundation/mpl-auction";
import { AnyPublicKey } from "@metaplex-foundation/mpl-core";
import { AuctionManager } from "@metaplex-foundation/mpl-metaplex";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import {
  programIds,
  StringPublicKey,
  // programIds,
  toPublicKey,
} from "../../../utils";
import {
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  SafetyDepositBox,
} from "../../actions";
import { ParsedAccount } from "../../contexts";

export * from "./redeemBid";
export * from "./redeemFullRightsTransferBid";
export * from "./startAuction";

export const METAPLEX_PREFIX = "metaplex";
export const TOTALS = "totals";
export const ORIGINAL_AUTHORITY_LOOKUP_SIZE = 33;
export const MAX_PRIZE_TRACKING_TICKET_SIZE = 1 + 32 + 8 + 8 + 8 + 50;
export const MAX_WHITELISTED_CREATOR_SIZE = 2 + 32 + 10;
export enum MetaplexKey {
  Uninitialized = 0,
  OriginalAuthorityLookupV1 = 1,
  BidRedemptionTicketV1 = 2,
  StoreV1 = 3,
  WhitelistedCreatorV1 = 4,
  PayoutTicketV1 = 5,
  SafetyDepositValidationTicketV1 = 6,
  AuctionManagerV1 = 7,
  PrizeTrackingTicketV1 = 8,
  SafetyDepositConfigV1 = 9,
  AuctionManagerV2 = 10,
  BidRedemptionTicketV2 = 11,
  AuctionWinnerTokenTypeTrackerV1 = 12,
}
export class PrizeTrackingTicket {
  key: MetaplexKey = MetaplexKey.PrizeTrackingTicketV1;
  metadata: string;
  supplySnapshot: BN;
  expectedRedemptions: BN;
  redemptions: BN;

  constructor(args: {
    metadata: string;
    supplySnapshot: BN;
    expectedRedemptions: BN;
    redemptions: BN;
  }) {
    this.key = MetaplexKey.PrizeTrackingTicketV1;
    this.metadata = args.metadata;
    this.supplySnapshot = args.supplySnapshot;
    this.expectedRedemptions = args.expectedRedemptions;
    this.redemptions = args.redemptions;
  }
}
export class PayoutTicket {
  key: MetaplexKey = MetaplexKey.PayoutTicketV1;
  recipient: StringPublicKey;
  amountPaid: BN;

  constructor(args: { recipient: StringPublicKey; amountPaid: BN }) {
    this.key = MetaplexKey.PayoutTicketV1;
    this.recipient = args.recipient;
    this.amountPaid = args.amountPaid;
  }
}

export class AuctionManagerV2 {
  key: MetaplexKey;
  store: StringPublicKey;
  authority: StringPublicKey;
  auction: StringPublicKey;
  vault: StringPublicKey;
  acceptPayment: StringPublicKey;
  state: AuctionManagerStateV2;
  auctionDataExtended?: StringPublicKey;

  constructor(args: {
    store: StringPublicKey;
    authority: StringPublicKey;
    auction: StringPublicKey;
    vault: StringPublicKey;
    acceptPayment: StringPublicKey;
    state: AuctionManagerStateV2;
  }) {
    this.key = MetaplexKey.AuctionManagerV2;
    this.store = args.store;
    this.authority = args.authority;
    this.auction = args.auction;
    this.vault = args.vault;
    this.acceptPayment = args.acceptPayment;
    this.state = args.state;

    AuctionExtended.getPDA(this.vault).then(
      (val) => (this.auctionDataExtended = val.toBase58())
    );
  }
}

export class AuctionManagerStateV2 {
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;
  safetyConfigItemsValidated: BN = new BN(0);
  bidsPushedToAcceptPayment: BN = new BN(0);
  hasParticipation: boolean = false;

  constructor(args?: AuctionManagerStateV2) {
    Object.assign(this, args);
  }
}

export class ParticipationStateV2 {
  collectedToAcceptPayment: BN = new BN(0);

  constructor(args?: ParticipationStateV2) {
    Object.assign(this, args);
  }
}

export class ParticipationConfigV2 {
  winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;
  nonWinningConstraint: NonWinningConstraint =
    NonWinningConstraint.GivenForFixedPrice;
  fixedPrice: BN | null = new BN(0);

  constructor(args?: ParticipationConfigV2) {
    Object.assign(this, args);
  }
}

export class RedeemBidArgs {
  instruction = 2;
}

export class RedeemFullRightsTransferBidArgs {
  instruction = 3;
}

export class StartAuctionArgs {
  instruction = 5;
}

export class EndAuctionArgs {
  instruction = 21;
  reveal: BN[] | null;
  constructor(args: { reveal: BN[] | null }) {
    this.reveal = args.reveal;
  }
}

export class ClaimBidArgs {
  instruction = 6;
}

export enum ProxyCallAddress {
  RedeemBid = 0,
  RedeemFullRightsTransferBid = 1,
}
export class RedeemUnusedWinningConfigItemsAsAuctioneerArgs {
  instruction = 12;
  winningConfigItemIndex: number;
  proxyCall: ProxyCallAddress;
  constructor(args: {
    winningConfigItemIndex: number;
    proxyCall: ProxyCallAddress;
  }) {
    this.winningConfigItemIndex = args.winningConfigItemIndex;
    this.proxyCall = args.proxyCall;
  }
}

export class EmptyPaymentAccountArgs {
  instruction = 7;
  winningConfigIndex: number | null;
  winningConfigItemIndex: number | null;
  creatorIndex: number | null;
  constructor(args: {
    winningConfigIndex: number | null;
    winningConfigItemIndex: number | null;
    creatorIndex: number | null;
  }) {
    this.winningConfigIndex = args.winningConfigIndex;
    this.winningConfigItemIndex = args.winningConfigItemIndex;
    this.creatorIndex = args.creatorIndex;
  }
}

export class SetStoreArgs {
  instruction = 8;
  public: boolean;
  constructor(args: { public: boolean }) {
    this.public = args.public;
  }
}

export class SetWhitelistedCreatorArgs {
  instruction = 9;
  activated: boolean;
  constructor(args: { activated: boolean }) {
    this.activated = args.activated;
  }
}

export class DecommissionAuctionManagerArgs {
  instruction = 13;
}

export class RedeemPrintingV2BidArgs {
  instruction = 14;
  editionOffset: BN;
  winIndex: BN;
  constructor(args: { editionOffset: BN; winIndex: BN }) {
    this.editionOffset = args.editionOffset;
    this.winIndex = args.winIndex;
  }
}
export class WithdrawMasterEditionArgs {
  instruction = 15;
}
export class RedeemParticipationBidV3Args {
  instruction = 19;
  winIndex: BN | null;
  constructor(args: { winIndex: BN | null }) {
    this.winIndex = args.winIndex;
  }
}

export enum WinningConstraint {
  NoParticipationPrize = 0,
  ParticipationPrizeGiven = 1,
}

export enum NonWinningConstraint {
  NoParticipationPrize = 0,
  GivenForFixedPrice = 1,
  GivenForBidPrice = 2,
}

export enum WinningConfigType {
  /// You may be selling your one-of-a-kind NFT for the first time, but not it's accompanying Metadata,
  /// of which you would like to retain ownership. You get 100% of the payment the first sale, then
  /// royalties forever after.
  ///
  /// You may be re-selling something like a Limited/Open Edition print from another auction,
  /// a master edition record token by itself (Without accompanying metadata/printing ownership), etc.
  /// This means artists will get royalty fees according to the top level royalty % on the metadata
  /// split according to their percentages of contribution.
  ///
  /// No metadata ownership is transferred in this instruction, which means while you may be transferring
  /// the token for a limited/open edition away, you would still be (nominally) the owner of the limited edition
  /// metadata, though it confers no rights or privileges of any kind.
  TokenOnlyTransfer,
  /// Means you are auctioning off the master edition record and it's metadata ownership as well as the
  /// token itself. The other person will be able to mint authorization tokens and make changes to the
  /// artwork.
  FullRightsTransfer,
  /// Means you are using authorization tokens to print off editions during the auction using
  /// from a MasterEditionV1
  PrintingV1,
  /// Means you are using the MasterEditionV2 to print off editions
  PrintingV2,
  /// Means you are using a MasterEditionV2 as a participation prize.
  Participation,
}

export class WhitelistedCreator {
  key: MetaplexKey = MetaplexKey.WhitelistedCreatorV1;
  address: StringPublicKey;
  activated: boolean = true;

  // Populated from name service
  twitter?: string;
  name?: string;
  image?: string;
  description?: string;

  constructor(args: { address: string; activated: boolean }) {
    this.address = args.address;
    this.activated = args.activated;
  }
}

export class Store {
  key: MetaplexKey = MetaplexKey.StoreV1;
  public: boolean = true;
  auctionProgram: StringPublicKey;
  tokenVaultProgram: StringPublicKey;
  tokenMetadataProgram: StringPublicKey;
  tokenProgram: StringPublicKey;

  constructor(args: {
    public: boolean;
    auctionProgram: StringPublicKey;
    tokenVaultProgram: StringPublicKey;
    tokenMetadataProgram: StringPublicKey;
    tokenProgram: StringPublicKey;
  }) {
    this.key = MetaplexKey.StoreV1;
    this.public = args.public;
    this.auctionProgram = args.auctionProgram;
    this.tokenVaultProgram = args.tokenVaultProgram;
    this.tokenMetadataProgram = args.tokenMetadataProgram;
    this.tokenProgram = args.tokenProgram;
  }
}

export interface BidRedemptionTicket {
  key: MetaplexKey;

  getBidRedeemed(order: number): boolean;
}

export interface AuctionViewItem {
  winningConfigType: WinningConfigType;
  amount: BN;
  metadata: ParsedAccount<Metadata>;
  safetyDeposit: ParsedAccount<SafetyDepositBox>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
}
export class BidRedemptionTicketV2 implements BidRedemptionTicket {
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV2;
  winnerIndex: BN | null;
  auctionManager: StringPublicKey;
  data: number[] = [];

  constructor(args: { key: MetaplexKey; data: number[] }) {
    Object.assign(this, args);
    let offset = 2;
    if (this.data[1] == 0) {
      this.winnerIndex = null;
    } else {
      this.winnerIndex = new BN(this.data.slice(2, 8), "le");
      offset += 8;
    }

    this.auctionManager = bs58.encode(this.data.slice(offset, offset + 32));
  }

  getBidRedeemed(order: number): boolean {
    let offset = 42;
    if (this.data[1] == 0) {
      offset -= 8;
    }
    const index = Math.floor(order / 8) + offset;
    const positionFromRight = 7 - (order % 8);
    const mask = Math.pow(2, positionFromRight);

    const appliedMask = this.data[index] & mask;

    return appliedMask != 0;
  }
}

export enum AuctionManagerStatus {
  Initialized,
  Validated,
  Running,
  Disbursing,
  Finished,
}

export enum TupleNumericType {
  U8 = 1,
  U16 = 2,
  U32 = 4,
  U64 = 8,
}

export class AmountRange {
  amount: BN;
  length: BN;
  constructor(args: { amount: BN; length: BN }) {
    this.amount = args.amount;
    this.length = args.length;
  }
}

export class InitAuctionManagerV2Args {
  instruction = 17;
  amountType: TupleNumericType = TupleNumericType.U8;
  lengthType: TupleNumericType = TupleNumericType.U8;
  maxRanges: BN = new BN(1);

  constructor(args: {
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    maxRanges: BN;
  }) {
    this.amountType = args.amountType;
    this.lengthType = args.lengthType;
    this.maxRanges = args.maxRanges;
  }
}

export class SafetyDepositConfig {
  key: MetaplexKey = MetaplexKey.SafetyDepositConfigV1;
  auctionManager: StringPublicKey = SystemProgram.programId.toBase58();
  order: BN = new BN(0);
  winningConfigType: WinningConfigType = WinningConfigType.PrintingV2;
  amountType: TupleNumericType = TupleNumericType.U8;
  lengthType: TupleNumericType = TupleNumericType.U8;
  amountRanges: AmountRange[] = [];
  participationConfig: ParticipationConfigV2 | null = null;
  participationState: ParticipationStateV2 | null = null;

  constructor(args: {
    data?: Uint8Array;
    directArgs?: {
      auctionManager: StringPublicKey;
      order: BN;
      winningConfigType: WinningConfigType;
      amountType: TupleNumericType;
      lengthType: TupleNumericType;
      amountRanges: AmountRange[];
      participationConfig: ParticipationConfigV2 | null;
      participationState: ParticipationStateV2 | null;
    };
  }) {
    if (args.directArgs) {
      Object.assign(this, args.directArgs);
    } else if (args.data) {
      this.auctionManager = bs58.encode(args.data.slice(1, 33));
      this.order = new BN(args.data.slice(33, 41), "le");
      this.winningConfigType = args.data[41];
      this.amountType = args.data[42];
      this.lengthType = args.data[43];
      const lengthOfArray = new BN(args.data.slice(44, 48), "le");
      this.amountRanges = [];
      let offset = 48;
      for (let i = 0; i < lengthOfArray.toNumber(); i++) {
        const amount = this.getBNFromData(args.data, offset, this.amountType);
        offset += this.amountType;
        const length = this.getBNFromData(args.data, offset, this.lengthType);
        offset += this.lengthType;
        this.amountRanges.push(new AmountRange({ amount, length }));
      }

      if (args.data[offset] == 0) {
        offset += 1;
        this.participationConfig = null;
      } else {
        // pick up participation config manually
        const winnerConstraintAsNumber = args.data[offset + 1];
        const nonWinnerConstraintAsNumber = args.data[offset + 2];
        let fixedPrice: BN | null = null;
        offset += 3;

        if (args.data[offset] == 1) {
          fixedPrice = new BN(args.data.slice(offset + 1, offset + 9), "le");
          offset += 9;
        } else {
          offset += 1;
        }
        this.participationConfig = new ParticipationConfigV2({
          winnerConstraint: winnerConstraintAsNumber,
          nonWinningConstraint: nonWinnerConstraintAsNumber,
          fixedPrice: fixedPrice,
        });
      }

      if (args.data[offset] == 0) {
        offset += 1;
        this.participationState = null;
      } else {
        // pick up participation state manually
        const collectedToAcceptPayment = new BN(
          args.data.slice(offset + 1, offset + 9),
          "le"
        );
        offset += 9;
        this.participationState = new ParticipationStateV2({
          collectedToAcceptPayment,
        });
      }
    }
  }

  getBNFromData(
    data: Uint8Array,
    offset: number,
    dataType: TupleNumericType
  ): BN {
    switch (dataType) {
      case TupleNumericType.U8:
        return new BN(data[offset], "le");
      case TupleNumericType.U16:
        return new BN(data.slice(offset, offset + 2), "le");
      case TupleNumericType.U32:
        return new BN(data.slice(offset, offset + 4), "le");
      case TupleNumericType.U64:
        return new BN(data.slice(offset, offset + 8), "le");
    }
  }

  getAmountForWinner(winner: BN): BN {
    let start = new BN(0);
    for (let i = 0; i < this.amountRanges.length; i++) {
      const end = start.add(this.amountRanges[i].length);
      if (winner.gte(start) && winner.lt(end)) {
        return this.amountRanges[i].amount;
      }
      start = end;
    }
    return new BN(0);
  }
}

export class ValidateSafetyDepositBoxV2Args {
  instruction = 18;
  safetyDepositConfig: SafetyDepositConfig;
  constructor(safetyDeposit: SafetyDepositConfig) {
    this.safetyDepositConfig = safetyDeposit;
  }
}

export const SCHEMA = new Map<any, any>([
  // ...DEPRECATED_SCHEMA,
  [
    PrizeTrackingTicket,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["metadata", "pubkeyAsString"],
        ["supplySnapshot", "u64"],
        ["expectedRedemptions", "u64"],
        ["redemptions", "u64"],
      ],
    },
  ],
  [
    AuctionManagerV2,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["store", "pubkeyAsString"],
        ["authority", "pubkeyAsString"],
        ["auction", "pubkeyAsString"],
        ["vault", "pubkeyAsString"],
        ["acceptPayment", "pubkeyAsString"],
        ["state", AuctionManagerStateV2],
      ],
    },
  ],
  [
    ParticipationConfigV2,
    {
      kind: "struct",
      fields: [
        ["winnerConstraint", "u8"], // enum
        ["nonWinningConstraint", "u8"],
        ["fixedPrice", { kind: "option", type: "u64" }],
      ],
    },
  ],

  [
    WhitelistedCreator,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["address", "pubkeyAsString"],
        ["activated", "u8"],
      ],
    },
  ],
  [
    Store,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["public", "u8"],
        ["auctionProgram", "pubkeyAsString"],
        ["tokenVaultProgram", "pubkeyAsString"],
        ["tokenMetadataProgram", "pubkeyAsString"],
        ["tokenProgram", "pubkeyAsString"],
      ],
    },
  ],
  [
    AuctionManagerStateV2,
    {
      kind: "struct",
      fields: [
        ["status", "u8"],
        ["safetyConfigItemsValidated", "u64"],
        ["bidsPushedToAcceptPayment", "u64"],
        ["hasParticipation", "u8"],
      ],
    },
  ],
  [
    ParticipationStateV2,
    {
      kind: "struct",
      fields: [["collectedToAcceptPayment", "u64"]],
    },
  ],
  [
    PayoutTicket,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["recipient", "pubkeyAsString"],
        ["amountPaid", "u64"],
      ],
    },
  ],
  [
    AmountRange,
    {
      kind: "struct",
      fields: [
        ["amount", "u64"],
        ["length", "u64"],
      ],
    },
  ],
  [
    SafetyDepositConfig,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["auctionManager", "pubkeyAsString"],
        ["order", "u64"],
        ["winningConfigType", "u8"],
        ["amountType", "u8"],
        ["lengthType", "u8"],
        ["amountRanges", [AmountRange]],
        [
          "participationConfig",
          { kind: "option", type: ParticipationConfigV2 },
        ],
        ["participationState", { kind: "option", type: ParticipationStateV2 }],
      ],
    },
  ],
  [
    RedeemUnusedWinningConfigItemsAsAuctioneerArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["winningConfigItemIndex", "u8"],
        ["proxyCall", "u8"],
      ],
    },
  ],
  [
    DecommissionAuctionManagerArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    RedeemPrintingV2BidArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["editionOffset", "u64"],
        ["winIndex", "u64"],
      ],
    },
  ],
  [
    WithdrawMasterEditionArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],

  [
    RedeemParticipationBidV3Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["winIndex", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    InitAuctionManagerV2Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["amountType", "u8"],
        ["lengthType", "u8"],
        ["maxRanges", "u64"],
      ],
    },
  ],
  [
    ValidateSafetyDepositBoxV2Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["safetyDepositConfig", SafetyDepositConfig],
      ],
    },
  ],
  [
    RedeemBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    RedeemFullRightsTransferBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],

  [
    StartAuctionArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    EndAuctionArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["reveal", { kind: "option", type: [BN] }],
      ],
    },
  ],
  [
    ClaimBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    EmptyPaymentAccountArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["winningConfigIndex", { kind: "option", type: "u8" }],
        ["winningConfigItemIndex", { kind: "option", type: "u8" }],
        ["creatorIndex", { kind: "option", type: "u8" }],
      ],
    },
  ],
  [
    SetStoreArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["public", "u8"], //bool
      ],
    },
  ],
  [
    SetWhitelistedCreatorArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["activated", "u8"], //bool
      ],
    },
  ],
]);

export async function getAuctionKeys(
  vault: string
): Promise<{ auctionKey: string; auctionManagerKey: string }> {
  const auctionKey = (await Auction.getPDA(vault)).toBase58();
  const auctionManagerKey = (
    await AuctionManager.getPDA(auctionKey)
  ).toBase58();

  return { auctionKey, auctionManagerKey };
}

export async function getBidRedemption(
  auctionKey: string,
  bidMetadata: AnyPublicKey
): Promise<string> {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(bidMetadata).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0].toBase58();
}

export async function getBidderKeys(
  auctionKey: string,
  bidder: string
): Promise<{ bidMetadata: AnyPublicKey; bidRedemption: AnyPublicKey }> {
  const bidMetadata = await BidderMetadata.getPDA(auctionKey, bidder);

  const bidRedemption = await getBidRedemption(auctionKey, bidMetadata);

  return { bidMetadata, bidRedemption };
}

export async function getOriginalAuthority(
  auctionKey: string,
  metadata: string
): Promise<string> {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(metadata).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0].toBase58();
}

export async function getPrizeTrackingTicket(
  auctionManager: string,
  mint: string
) {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(PROGRAM_IDS.metaplex).toBuffer(),
        toPublicKey(auctionManager).toBuffer(),
        toPublicKey(mint).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0].toBase58();
}

export async function getAuctionWinnerTokenTypeTracker(auctionManager: string) {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(PROGRAM_IDS.metaplex).toBuffer(),
        toPublicKey(auctionManager).toBuffer(),
        Buffer.from(TOTALS),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0].toBase58();
}

export async function getSafetyDepositConfig(
  auctionManager: string,
  safetyDeposit: string
) {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(PROGRAM_IDS.metaplex).toBuffer(),
        toPublicKey(auctionManager).toBuffer(),
        toPublicKey(safetyDeposit).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0].toBase58();
}

export async function getPayoutTicket(
  auctionManager: string,
  winnerConfigIndex: number | null | undefined,
  winnerConfigItemIndex: number | null | undefined,
  creatorIndex: number | null | undefined,
  safetyDepositBox: string,
  recipient: string
) {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(auctionManager).toBuffer(),
        Buffer.from(
          winnerConfigIndex !== null && winnerConfigIndex !== undefined
            ? winnerConfigIndex.toString()
            : "participation"
        ),
        Buffer.from(
          winnerConfigItemIndex !== null && winnerConfigItemIndex !== undefined
            ? winnerConfigItemIndex.toString()
            : "0"
        ),
        Buffer.from(
          creatorIndex !== null && creatorIndex !== undefined
            ? creatorIndex.toString()
            : "auctioneer"
        ),
        toPublicKey(safetyDepositBox).toBuffer(),
        toPublicKey(recipient).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0].toBase58();
}