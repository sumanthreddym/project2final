import React from 'react'
import ReactDOM from 'react-dom'
import '../css/index.css'

const AWSHttpProvider = require('@aws/web3-http-provider');
const Web3 = require('web3');
// var Accounts = require('web3-eth-accounts');
const SERVERURL = "http://localhost:8080"
class App extends React.Component {
   constructor(props){
      super(props)
      this.state = {
         customer: '0xD0b44f9b3D13eb5B926d48f8C8B6446928DF810C',
         customerId: 'Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP',
         isLoadingPatients: true,
         isLoadingPurchases: true,
         purchaseHistory: 'NONE',
         listOfPatients: []
      }
     

      // this.state.myWeb3 = new Web3(new AWSHttpProvider("https://nd-oa5ybixihrd35htiy2hgqpdfki.ethereum.managedblockchain.us-east-1.amazonaws.com",credentials));
      const oldProvider = window.web3.currentProvider;
      this.state.localWeb3 = new Web3(oldProvider); 
      this.state.awsWeb3 = new Web3(SERVERURL+"/api/send")
      const MyContract = new this.state.awsWeb3.eth.Contract([{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"address payable","name":"patient","type":"address"}],"name":"buyHealthInfo","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"}],"name":"retrievePurchaseHistory","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"address[]","name":"","type":"address[]"},{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"}], "0x8ef3732d7b5ee5548201dd57c005bd353823738b")

      // this.state.ContractInstance = MyContract.at("0x8ef3732d7b5ee5548201dd57c005bd353823738b")
      this.state.ContractInstance = MyContract
      this.state.localWeb3.eth.getAccounts().then((accounts)=>{
         console.log(accounts)
         this.state.customer = accounts[0]
      });
      const privateKey = "abd0c48fdb8db954410b6c5e51765ca8b5914c57cf2ad53318181857b970e74a";
      this.state.customerAccount = this.state.awsWeb3.eth.accounts.privateKeyToAccount(privateKey);
      console.log(this.state.ContractInstance);
      window.a = this.state;
   }

   componentDidMount(){
      this.updateState()
      setInterval(this.updateState.bind(this), 60000)
   }

   updateState(){
      // if('ContractInstance' in this.state){
      //    this.state.ContractInstance.methods.retrievePurchaseHistory(this.state.customer).call((result, err) => {
      //       console.log("RETREIVED PURCHASE HISTORY")
      //       console.log(err)
      //       console.log(result)
      //       if(result != null){
      //          // this.setState({
      //          //    purchaseHistory: JSON.parse(result)
      //          // })
               
      //       }
      //    })
      // }

      fetch(SERVERURL+'/api/purchases?customerId='+this.state.customerId).then((response) =>{
         
         response.json().then((result)=>{
            console.log(result)
            this.setState({purchaseHistory: result['data']})
            console.log(this.state.purchaseHistory)
            this.setState({isLoadingPurchases: false})
         })
         console.log(this.state.purchaseHistory)
      })

      fetch(SERVERURL+'/api/patients').then((response) =>{
         response.json().then((result)=>{
            console.log(result)
            this.setState({listOfPatients: result['data']})

            console.log(this.state.listOfPatients)
            this.setState({isLoadingPatients: false})
         })
         
      })
      
   }


   buyHealthInfo(price, patientWalletId){
      const tx = this.state.ContractInstance.methods.buyHealthInfo(price, patientWalletId);
      const gas = tx.estimateGas({ from: this.state.customer, value: price });
      gas.then((gasVal)=>{
         this.state.customerAccount.signTransaction({
            from: this.state.customer,
            data: tx.encodeABI(),
            to: patientWalletId,
            value: this.state.localWeb3.utils.toWei(price, 'kwei'),
            gas: gasVal
          }).then((signedTx)=>{
            this.state.awsWeb3.eth.sendSignedTransaction(signedTx.rawTransaction).then((receipt)=>{
                   console.log("TRANSACTION RESPONSE RECEIVED")
                   console.log(receipt)
                   console.log(receipt.transactionHash)
                   txHash = receipt.transactionHash
                }).catch((err)=>console.log(err));
          })
      })
   }

   requestInformation(patientId){
      console.log(`patientid ${patientId}`)
      console.log(`customerID ${this.state.customerId}`)

      fetch(SERVERURL+'/api/data/request?patientId='+patientId+'&customerId='+this.state.customerId).then((response) =>{
      response.json().then((result)=>{
         this.updateState()
      });
   })
   }

   browserDownload(content, fileName, contentType) {
      const a = document.createElement("a");
      const file = new Blob([content], { type: contentType });
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.click();
   }

   downloadData(patientId){
      fetch(SERVERURL+'/api/data/link/'+patientId).then((response) =>{
      response.json().then((result)=>{
         this.browserDownload(JSON.stringify(result), "json-file-name.json", "text/plain");
      })});
   }

   render(){
      return (
         <div className="main-container">

            {/* <h6>Are you from a Health care facility, Researcher, Pharmaceutical company? You can buy/get access to health data of one of the following patients</h6> */}

            <div>
               <h6>List of Patients who have listed their data on Health Data Market</h6>
                     
            </div>
            <div className="col s12 card">
                  
                  <table className="centered">
                    <thead>
                      <tr>
                        <th>PatientId</th>
                        <th>Patient Wallet Id</th>
                        <th>Price</th>
                        <th>Total Data Available</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                    !this.state.isLoadingPatients?
                        this.state.listOfPatients.map((patientData)=> (<tr key={patientData.patientId}>
                           <td>{patientData.patientId}</td>
                           <td>{patientData.patientWalletAddress}</td>
                           <td>{patientData.price}</td>
                           <td>{patientData.numberOfRowsAvailable}</td>
                           <td><a class="waves-effect waves-light btn" onClick={() => this.requestInformation(patientData.patientId)}>REQUEST INFO</a></td>
                         </tr>
                        )):(<div>Loading</div>)
                     
                      }
                    </tbody>
                  </table>

                </div>
                <div>
               <h6>List of your transaction/purchases on Health Data Market</h6>
                     
            </div>
                <div className="col s12 card">
                  
                  <table className="centered">
                    <thead>
                      <tr>
                        <th>PatientId</th>
                        <th>Price</th>
                        <th>Total Data Available</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                          this.state.isLoadingPurchases?(<div>Loading</div>):this.state.purchaseHistory == 'NONE'?(<div>You have no transactions</div>):this.state.purchaseHistory.map((purchaseData)=> (<tr key={purchaseData.patientId}>
                        <td>{purchaseData.patientId}</td>
                        <td>{purchaseData.price}</td>
                        <td>{purchaseData.numberOfDataShared}</td>
                        <td>{purchaseData.status}</td>
                        {purchaseData.status == 'ACCEPTED'? (<td><a class="waves-effect waves-light btn" onClick={() => this.buyHealthInfo("1", purchaseData.patientWalletAddress)}>PURCHASE</a></td>):(<td></td>)}
                        {purchaseData.status == 'COMPLETED'? (<td><a class="waves-effect waves-light btn" onClick={() => this.downloadData(purchaseData.patientId)}>DOWNLOAD</a></td>):(<td></td>)}
                      </tr>
                     ))
                  }
                    </tbody>
                  </table>

                </div>
         </div>
      )
   }
}

ReactDOM.render(
   <App />,
   document.querySelector('#root')
)
