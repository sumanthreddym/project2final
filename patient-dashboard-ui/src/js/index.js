import React from 'react'
import ReactDOM from 'react-dom'
import '../css/index.css'

const AWSHttpProvider = require('@aws/web3-http-provider');
const Web3 = require('web3');

class App extends React.Component {
   constructor(props){
      super(props)
      this.state = {
         patient: '0xD0b44f9b3D13eb5B926d48f8C8B6446928DF810C',
         patientId: 'QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL',
         isLoadingPurchases: true,
         purchaseHistory: 'NONE'
      }

      window.a = this.state;
   }

   componentDidMount(){
      this.updateState()
      setInterval(this.updateState.bind(this), 60000)
   }

   updateState(){

      fetch('http://localhost:8080/api/patient/purchases?patientId='+this.state.patientId).then((response) =>{
         
         response.json().then((result)=>{
            console.log(result)
            this.setState({purchaseHistory: result['data']})
            console.log(this.state.purchaseHistory)
            this.setState({isLoadingPurchases: false})
         })
         console.log(this.state.purchaseHistory)
      })
      
   }


   acceptRequestForInformation(customerId){
      console.log(`patientid ${customerId}`)
      console.log(`customerID ${this.state.patientId}`)

      fetch('http://localhost:8080/api/data/accept?patientId='+this.state.patientId+'&customerId='+customerId).then((response) =>{
         console.log(response)
      response.json().then((result)=>{
         this.updateState()
      });
   })
   }

   render(){
      return (
         <div className="main-container">


            <div>
               <h6>List of Requests you have received for Data Sharing on Health Data Market</h6>
                     
            </div>
                <div className="col s12 card">
                  
                  <table className="centered">
                    <thead>
                      <tr>
                        <th>Customer Id</th>
                        <th>Price</th>
                        <th>Total Data Available</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                          this.state.isLoadingPurchases?(<div>Loading</div>):this.state.purchaseHistory == 'NONE'?(<div>You have no transactions</div>):this.state.purchaseHistory.map((purchaseData)=> (<tr key={purchaseData.patientId}>
                        <td>{purchaseData.customerId}</td>
                        <td>{purchaseData.price}</td>
                        <td>{purchaseData.numberOfDataShared}</td>
                        <td>{purchaseData.status}</td>
                        
                        {purchaseData.status == 'PENDING'? (<td><a class="waves-effect waves-light btn" onClick={() => this.acceptRequestForInformation(purchaseData.customerId)}>ACCEPT</a></td>):(<td></td>)}

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
