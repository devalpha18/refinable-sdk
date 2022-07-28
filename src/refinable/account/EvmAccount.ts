import { ethers } from "ethers";
import { Account } from "../../interfaces/Account";
import { NativeCurrency } from "../../interfaces/Config";
import EvmTransaction from "../../transaction/EvmTransaction";
import { ContractWrapper } from "../contract/ContractWrapper";
import { Refinable } from "../Refinable";

export default class EvmAccount implements Account {
  constructor(protected readonly refinable: Refinable) {}

  async getAddress(): Promise<string> {
    return this.refinable.evm.signer.getAddress();
  }

  /**
   * Balance of Any Token (converted from wei).
   * @return {Promise<string>}
   */
  public async getTokenBalance(
    tokenAddress: string,
    userEthAddress?: string
  ): Promise<string> {
    if (tokenAddress == null) return null;

    let result = null;
    const decimals = await this.getTokenDecimals(tokenAddress);

    try {
      const token = new ethers.Contract(
        tokenAddress,
        [
          {
            constant: true,
            inputs: [
              {
                name: "_owner",
                type: "address",
              },
            ],
            name: "balanceOf",
            outputs: [
              {
                name: "balance",
                type: "uint256",
              },
            ],
            payable: false,
            stateMutability: "view",
            type: "function",
          },
        ],
        this.refinable.evm.provider
      );
      const balance = await token.balanceOf(
        userEthAddress ?? this.refinable.accountAddress
      );
      result = ethers.utils.formatUnits(balance, decimals);
    } catch (e) {
      console.error(`ERROR: Failed to get the balance: ${e.message}`);
    }
    return result;
  }

  /**
   * Decimals of Any Token
   * @return {Promise<number>}
   */
  public async getTokenDecimals(tokenAddress: string): Promise<number> {
    let decimals = 18;
    if (tokenAddress == null) return decimals;

    try {
      const token = new ethers.Contract(
        tokenAddress,
        [
          {
            constant: true,
            inputs: [],
            name: "decimals",
            outputs: [{ name: "", type: "uint8" }],
            type: "function",
          },
        ],
        this.refinable.evm.provider
      );
      decimals = await token.decimals();
    } catch (e) {
      console.error(`ERROR: Failed to get decimals : ${e.message}`);
    }
    return decimals;
  }

  /**
   * Balance of Native currency.(converted from wei).
   * @return {Promise<string>}
   */
  public async getBalance(
    chainId?: number,
    userEthAddress?: string
  ): Promise<string> {
    const getBalancePromise = chainId
      ? this.refinable.evm
          .getProviderByChainId(chainId)
          .getBalance(userEthAddress ?? this.refinable.accountAddress)
      : this.refinable.evm.signer.getBalance();

    const result = await getBalancePromise;
    return ethers.utils.formatEther(result).toString();
  }

  /**
   * Approve a certain allowance for a ERC20 token
   * @param token
   * @param amount
   * @param spenderAddress
   * @returns {Promise<EvmTransaction>}
   */
  public async approveTokenContractAllowance(
    token: NativeCurrency,
    amount: number,
    spenderAddress: string
  ): Promise<EvmTransaction> {
    // Native currency does not need to be approved
    if (token.native === true) return;

    const erc20Contract = new ContractWrapper(
      {
        address: token.address,
        abi: [`function approve(address _spender, uint256 _value)`],
      },
      this.refinable.evm.provider,
      this.refinable.evm.options
    );

    const formattedAmount = ethers.utils
      .parseUnits(amount.toString(), token.decimals)
      .toString();

    const response = await erc20Contract.sendTransaction("approve", [
      spenderAddress,
      formattedAmount,
    ]);

    return response;
  }
}
