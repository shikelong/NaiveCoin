import express from "express";
import bodyParser from "body-parser";
import Block from "../Block";
import { connectToPeers, getSockets, initP2PServer } from "./p2p";
import { blockChainInstance } from "../BlockChain";
import Wallet, { getBalance } from "../transaction/Wallet";
import { getTransactionPool } from "../transaction/TransactionPool";
import { Transaction } from "../transaction/Transaction";
import { TxOut } from "../transaction/TxOut";
import { TxIn } from "../transaction/TxIn";

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (port: number) => {
  const app = express();

  app.use(bodyParser.json());

  app.get("/blocks", (req, res) => {
    res.send(blockChainInstance.blocks);
  });
  app.post("/mineBlock", (req, res) => {

    const txs = req.body.data.map((item) => {
      const transactions = new Transaction();
      transactions.txOuts = item.txOuts.map((to) => {
        return new TxOut(to.address, to.amount);
      });
      transactions.txIns = item.txIns.map((txIn) => {
        const newIn = new TxIn();
        newIn.txOutId = txIn.txOutId;
        newIn.txOutIndex = txIn.txOutIndex;
        newIn.signature = txIn.signature;
      });
      transactions.id = item.id;
      return transactions
    })

    const newBlock: Block = blockChainInstance.generateNextBlock(txs);
    res.send(newBlock);
  });
  app.get("/peers", (req, res) => {
    res.send(
      getSockets().map(
        (s: any) => s._socket.remoteAddress + ":" + s._socket.remotePort
      )
    );
  });
  app.post("/addPeer", (req, res) => {
    connectToPeers((req.body as any).peer);
    res.send();
  });

  app.post("/mineRawBlock", (req, res) => {
    if (req.body.data == null) {
      res.send("data parameter is missing");
      return;
    }
    const newBlock: Block = blockChainInstance.generateRawNextBlock(
      req.body.data
    );
    if (newBlock === null) {
      res.status(400).send("could not generate block");
    } else {
      res.send(newBlock);
    }
  });

  app.get("/balance", (req, res) => {
    const balance = getBalance(
      req.body.address,
      blockChainInstance.unspentTxOuts
    );
    res.send({ balance });
  });

  app.post("/mineTransaction", (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;

    try {
      const newBlock = blockChainInstance.generateNextBlockWithTransaction(
        address,
        amount
      );
      res.send(newBlock);
    } catch (e) {
      res.status(400).send(e.message);
    }
  });

  app.post("/sendTransaction", (req, res) => {
    try {
      const address = req.body.address;
      const amount = req.body.amount;

      if (address === undefined || amount === undefined) {
        throw Error("invalid address or amount");
      }
      const resp = blockChainInstance.sendTransaction(address, amount);
      res.send(resp);
    } catch (e) {
      console.log(e.message);
      res.status(400).send(e.message);
    }
  });

  app.get("/transactionPool", (req, res) => {
    res.send(getTransactionPool());
  });

  app.post("/stop", (req, res) => {
    res.send({ msg: "stopping server" });
    process.exit();
  });

  app.listen(port, () => {
    console.log("Listening http on port: " + port);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
