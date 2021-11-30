/**
 * provide the information: where the coins are from
 * earlier output (coins unlocked) ====> Input
 */
export class TxIn {
  public txOutId: string;
  public txOutIndex: number;
  /**
   * 对 transactionId 进行签名
   */
  public signature: string;

  public isValid(): boolean {
    if (typeof this.signature !== "string") {
      console.log("invalid signature type in txIn");
      return false;
    } else if (typeof this.txOutId !== "string") {
      console.log("invalid txOutId type in txIn");
      return false;
    } else if (typeof this.txOutIndex !== "number") {
      console.log("invalid txOutIndex type in txIn");
      return false;
    } else {
      return true;
    }
  }
}
