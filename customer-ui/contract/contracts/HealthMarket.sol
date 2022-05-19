pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

contract HealthMarket {
    address public owner;
    mapping(address => PurchaseHistory) internal purchaseHistory;

    struct Purchase {
        uint256 price;
        address customer;
        address patient;
    }

    struct PurchaseHistory {
        bool exists;
        uint256 numberOfPurchases;
        mapping(uint256 => Purchase) purchases;
    }

    function buyHealthInfo(
        uint256 price,
        address payable patient
    ) public payable {

        if (!purchaseHistory[patient].exists) {
            purchaseHistory[patient] = PurchaseHistory ({
                exists : true,
                numberOfPurchases : 0
            });
        }

        uint256 idx = purchaseHistory[patient].numberOfPurchases;
        purchaseHistory[patient].purchases[idx] = Purchase ({
            price : price,
            customer : msg.sender,
            patient : patient
        });

        purchaseHistory[patient].numberOfPurchases += 1;

        patient.transfer(price);
    }

    function retrievePurchaseHistory(address patient) public view returns (
        uint256[] memory,
        address[] memory,
        address[] memory
        ) {
        PurchaseHistory storage history = purchaseHistory[patient];
        uint256 count = history.numberOfPurchases;
        uint256[] memory priceArray = new uint256[](count);
        address[] memory customerArray = new address[](count);
        address[] memory patientArray = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            priceArray[i] = history.purchases[i].price;
            customerArray[i] = history.purchases[i].customer;
            patientArray[i] = history.purchases[i].patient;
        }
        
        return (priceArray, customerArray, patientArray);
    }

    constructor() public {
        owner = msg.sender;
    }

}