import { Transaction } from "./transaction";
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

  static isValidBlock = (block: Block) => {
    return (
      typeof block.index === "number" &&
      typeof block.hash === "string" &&
      typeof block.previousHash === "string" &&
      typeof block.timeStamp === "number" &&
      typeof block.data === "string"
    );
  };

  static hashMatchesDifficulty = (hash: string, difficulty: number) => {
    const hashInBinary: string = hex2Binary(hash);
    const requiredPrefix = "0".repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
  };
}
