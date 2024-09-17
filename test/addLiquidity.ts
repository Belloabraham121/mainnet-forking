import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import {ethers} from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("addLiqiudity", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployUseSwap() {


    const [owner] = await ethers.getSigners();
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    const UseSwap = await ethers.getContractFactory("UseSwap");
    const useSwap = await UseSwap.deploy(ROUTER_ADDRESS);

    return { useSwap, owner, ROUTER_ADDRESS };
  }

  describe("Deployment", function () {

    it("Should set the right router address",async function () {
      const { useSwap, ROUTER_ADDRESS } = await loadFixture(deployUseSwap);


      expect(await useSwap.uniswapRouter()).to.equal(ROUTER_ADDRESS);
      
    })

    it("Should add liquidity", async function () {
      const { useSwap, ROUTER_ADDRESS } = await loadFixture(deployUseSwap);

      const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";
      const USDC_DAI_PAIR = "0xAE461cA67B15dc8dc81CE7615e0320dA1A9aB8D5";
      
      await helpers.impersonateAccount(TOKEN_HOLDER);
      const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

      const amountADesired = ethers.parseUnits("100", 6);
      const amountBDesired = ethers.parseUnits("100", 18);
      const amountAMinimum = ethers.parseUnits("90", 6);
      const amountBMinimum = ethers.parseUnits("90", 18);

      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
      const DAI_Contract = await ethers.getContractAt("IERC20", DAI, impersonatedSigner);
      const LP_COntracts = await ethers.getContractAt("IERC20", USDC_DAI_PAIR, impersonatedSigner); 


      await USDC_Contract.approve(useSwap, amountADesired);
      await DAI_Contract.approve(useSwap, amountBDesired);
      const lpBalBefore = await LP_COntracts.balanceOf(impersonatedSigner.address);


      const tx = await useSwap.connect(impersonatedSigner).handleAddLiquidity(
          USDC, 
          DAI, 
          amountADesired, 
          amountBDesired, 
          amountAMinimum, 
          amountBMinimum,  
          impersonatedSigner.address, 
          deadline);

      await tx.wait();

      expect(await useSwap.liquidityCount()).to.equal(1);
      expect(await LP_COntracts.balanceOf(impersonatedSigner.address)).not.to.equal(lpBalBefore);


    });
  });
});
