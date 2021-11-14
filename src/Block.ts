export default class Block {
  public index: number;
  public data: string;
  public previousHash: string;
  public hash: string;
  public timeStamp: number;

  constructor(
    index: number,
    hash: string,
    previousHash: string,
    timeStamp: number,
    data: string
  ) {
    this.index = index;
    this.previousHash = previousHash;
    this.timeStamp = timeStamp;
    this.data = data;
    this.hash = hash;
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
}
