const {network, ethers} = require("hardhat")

const {developmentChains, networkConfig} = require("../helper-hardhat.config");

const subFees= ethers.utils.parseEther("1"); 

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId;
let VRFCoordinatorV2Address,
    subId
;

if(developmentChains.includes(network.name)){
    if(chainId ==31337){
    const VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address;
    const txrs = await VRFCoordinatorV2Mock.createSubscription()
    const txrt = await txrs.wait(1);
    subId = txrt.events[0].args.subId
    await VRFCoordinatorV2Mock.fundSubscription(subId, subFees);
}
else{
    VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinator"]
    subId = networkConfig[chainId][subId];
}

    VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinator"]
    subId = networkConfig[chainId]["subId"];


const entranceFee = networkConfig[chainId]["entranceFee"].toString();
const gasLane = networkConfig[chainId]["gasLane"];
const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
const args = [VRFCoordinatorV2Address,entranceFee,gasLane,subId,callbackGasLimit];
console.log(args);
// const args = []
console.log("deploying raffle......");


    const raffle = await deploy("Raffle", {
   
        from: deployer,
        args: args,
        log: true,
        waitConfirmations : network.config.blockConfirmations || 1,
    }
    )




}}


module.exports.tags = ["all", "raffle"]
