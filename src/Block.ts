import { Transaction } from "./transaction/Transaction";
import { hex2Binary } from "./utils/utils";

export default class Block {
  constructor(
    public index: number,
    public hash: string,
    public previousHash: string,
    public timeStamp: number,
    public data: Transaction[],
    public difficulty: number,
    public nonce: number
  ) {}

  static hashMatchesDifficulty = (hash: string, difficulty: number) => {
    const hashInBinary: string = hex2Binary(hash);
    const requiredPrefix = "0".repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
  };
}
