import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI Token Address
    const ETH_DAI_PAIR = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11"; // DAI/ETH LP Token

    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621"; // DAI holder address

    await helpers.impersonateAccount(TOKEN_HOLDER); // Impersonate the DAI holder
    // Add ETH to the impersonated account to cover gas fees
    await helpers.setBalance(TOKEN_HOLDER, ethers.parseEther("10"));
    
    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    const amountDAIDeposit = ethers.parseUnits("2", 18); // Deposit 2 DAI
    const amountAMin = ethers.parseUnits("1", 18); // Minimum amount of tokens

    // Use IERC20 for standard ERC-20 methods (approve, balanceOf)
    const DAI_Contract = await ethers.getContractAt("IERC20", DAI, impersonatedSigner);
    const LP_DAI_ETH_Contract = await ethers.getContractAt("IERC20", ETH_DAI_PAIR, impersonatedSigner);
    const ROUTER = await ethers.getContractAt("IUniswapV2Router", ROUTER_ADDRESS, impersonatedSigner);

    const ETHBal = await ethers.provider.getBalance(impersonatedSigner.address);
    const ETHDAIBal = await LP_DAI_ETH_Contract.balanceOf(impersonatedSigner.address);

    console.log("ETH token balance before liquidity", ETHBal.toString());
    console.log("LP DAI ETH token balance before liquidity", ETHDAIBal.toString());

    // Check DAI balance before adding liquidity
    const DAIBalance = await DAI_Contract.balanceOf(impersonatedSigner.address);
    console.log("DAI balance before liquidity:", DAIBalance.toString());

    // Approve the router to spend DAI on behalf of the token holder
    console.log("Approving router to spend DAI...");
    await DAI_Contract.approve(ROUTER_ADDRESS, amountDAIDeposit);

    const deadline = Math.floor(Date.now() / 1000) + (60 * 10);

    // Add liquidity ETH with DAI
    await ROUTER.addLiquidityETH(
        DAI,
        amountDAIDeposit,
        amountAMin,
        1, 
        TOKEN_HOLDER,
        deadline,
        { value: ethers.parseEther("0.1") } // 0.1 ETH contribution
    );

    console.log("=========================================================");

    const ETHBalAfter = await ethers.provider.getBalance(impersonatedSigner.address);
    const ETHDAIBalAfter = await LP_DAI_ETH_Contract.balanceOf(impersonatedSigner.address);

    console.log("ETH token balance after liquidity", ETHBalAfter.toString());
    console.log("LP DAI ETH token balance after liquidity", ETHDAIBalAfter.toString());

    // Approve the router to spend LP tokens for removing liquidity
    await LP_DAI_ETH_Contract.approve(ROUTER_ADDRESS, ETHDAIBalAfter);

    console.log("=========================================================");

    // Use IERC20Permit for permit-related methods (nonces, permit)
    const DAI_ContractPermit = await ethers.getContractAt("IERC20Permit", DAI, impersonatedSigner);
    const nonce = await DAI_ContractPermit.nonces(TOKEN_HOLDER);
    const name = await DAI_Contract.name(); // Using IERC20 to get the token name
    const { chainId } = await ethers.provider.getNetwork();
    console.log("Chain ID:", chainId);

    const domain = {
        name: name,
        version: "1",
        chainId: chainId,
        verifyingContract: DAI,
    };

    // Define the Permit types (EIP-2612)
    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ],
    };

    // Define the values for the permit
    const values = {
        owner: TOKEN_HOLDER,
        spender: ROUTER_ADDRESS,
        value: ETHDAIBalAfter,
        nonce: nonce,
        deadline: deadline,
    };

    // Sign the permit message using EIP-712
    const signature = await impersonatedSigner.signTypedData(domain, types, values);
    const sig = ethers.Signature.from(signature);
    const { v, r, s } = sig;

    // Remove liquidity using the signed permit
    const removeLiqTX = await ROUTER.removeLiquidityETHWithPermit(
        DAI,
        ETHDAIBalAfter,
        0, // Minimum amount of DAI to withdraw
        0, // Minimum amount of ETH to withdraw
        impersonatedSigner.address,
        deadline,
        true,
        v,
        r,
        s
    );
    await removeLiqTX.wait();

    const ETHBalAfterRemove = await ethers.provider.getBalance(impersonatedSigner.address);
    const ETHDAIBalAfterRemove = await LP_DAI_ETH_Contract.balanceOf(impersonatedSigner.address);

    console.log("ETH balance after removing liquidity", ETHBalAfterRemove.toString());
    console.log("LP DAI ETH token balance after removing liquidity", ETHDAIBalAfterRemove.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
