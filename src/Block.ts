import { Transaction } from "./transaction";

export default class Block {
  public index: number;
  public data: Transaction[];
  public previousHash: string;
  public hash: string;
  public timeStamp: number;
  public difficulty: number;
  public nonce: number;

  constructor(
    index: number,
    hash: string,
    previousHash: string,
    timeStamp: number,
    data: Transaction[],
    difficulty: number,
    nonce: number
  ) {
    this.index = index;
    this.previousHash = previousHash;
    this.timeStamp = timeStamp;
    this.data = data;
    this.hash = hash;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }

  static isValidBlock = (block: Block) => {
    return (
      typeof block.index === "number" &&
      typeof block.hash === "string" &&
      typeof block.previousHash === "string" &&
      typeof block.timeStamp === "number" &&
      typeof block.data === "string"
    );
  };

  static hexToBinary = (hex: string) => {
    const binary = [];
    for (let i = 0; i < hex.length; i += 2) {
      const hexByte = hex.substr(i, 2);
      binary.push(parseInt(hexByte, 16).toString(2));
    }
    return binary.join("");
  };

  static hashMatchesDifficulty = (hash: string, difficulty: number) => {
    const hashInBinary: string = Block.hexToBinary(hash);
    const requiredPrefix = "0".repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
  };
}
