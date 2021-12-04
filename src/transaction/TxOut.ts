import { isValidAddress } from "../utils/cryptoUtils";

class TxOut {
  //address is a ECC public key, It means the private key's owner can accept the coins.
  constructor(public address: string, public amount: number) {}

  public isValid(): boolean {
    if (typeof this.address !== "string") {
      console.log("invalid address type in txOut");
      return false;
    } else if (!isValidAddress(this.address)) {
      console.log("invalid TxOut address");
      return false;
    } else if (typeof this.amount !== "number") {
      console.log("invalid amount type in txOut");
      return false;
    } else {
      return true;
    }
  }
}

export { TxOut };
