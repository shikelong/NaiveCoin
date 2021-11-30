/**
 * 还没有被下一个 Transaction 花费的 Output 称之为 UTXO
 */
import { TxOut } from "./TxOut";

class UnspentTxOut extends TxOut {
  public readonly txOutId: string;
  public readonly txOutIndex: number;

  constructor(
    txOutId: string,
    txOutIndex: number,
    address: string,
    amount: number
  ) {
    super(address, amount);
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
  }
}

export { UnspentTxOut };
