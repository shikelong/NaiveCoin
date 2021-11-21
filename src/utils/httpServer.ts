import express from "express";
import bodyParser from "body-parser";
import Block from "../Block";
import BlockChain from "../BlockChain";
import { connectToPeers, getSockets, initP2PServer } from "./p2p";
import { blockChainInstance } from "../BlockChain";
import { getBalance, initWallet } from "../wallet";

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (port: number) => {
  const app = express();

  app.use(bodyParser.json());

  app.get("/blocks", (req, res) => {
    res.send(blockChainInstance.getBlockChain());
  });
  app.post("/mineBlock", (req, res) => {
    const newBlock: Block = blockChainInstance.generateNextBlock(req.body.data);
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

  app.get("/balance", (req, res) => {
    const balance = getBalance(
      req.body.address,
      blockChainInstance.getUnspentTxOuts()
    );
    res.send({ balance });
  });

  app.get("/mineTransaction", (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;

    try {
      const newBlock = blockChainInstance.generateNextBlockWithTransaction(
        address,
        amount
      );
      res.send(newBlock)
    } catch (e) {
      res.status(400).send(e.message);
    }
  });

  app.listen(port, () => {
    console.log("Listening http on port: " + port);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
initWallet();
