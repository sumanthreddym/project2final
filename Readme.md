### Detailed Project documentation can be found in the following files in this repository:

- Project 2 Presentation.pdf
- Project 2 Report.pdf

### Steps to run the project:

Before you proceed with the following steps, please create GCP firestore database, Azure Service bus and Ethereum Ropsten node on AWS Blockchain service.

#### 1. Steps to run customer-ui

```
cd customer-ui
npm install             
npx webpack --config webpack.config.js
npm i http-server
http-server ./dist   
```

#### 2. Steps to run patient-dashboard-ui

```
cd patient-dashboard-ui
npm install             
npx webpack --config webpack.config.js
npm i http-server
http-server ./dist   
```

#### 3. Steps to run master peer(No replicas allowed in current architecture)
Note: 
- Datastore peer uses GCP Firestore. Create your credentials on GCP(https://cloud.google.com/docs/authentication/getting-started) and copy the content of the generated JSON file to the file present at datastore/total-pier-349316-c9a8336e908c.json 
- Also, create Azure credentials and add the connection string in the index.js file(Specifically, set the value of the constant "connectionString" in index.js file).
- Finally, create Admin credentials(or Blockchain permissions) on AWS and add AWS_ACCESS_KEY and SECRET_ACCESS_KEY in the index.js file(Specifically, you need to set the values of the constants AWS_ACCESS_KEY and SECRET_ACCESS_KEY).

```
cd master
npm install             
node index.js
```

#### 4. Steps to run datastore peer(Multiple peers of this type can be launched)
Note: Datastore peer uses GCP Firestore. Create your credentials on GCP(https://cloud.google.com/docs/authentication/getting-started) and copy the content of the generated JSON file to the file present at datastore/total-pier-349316-c9a8336e908c.json 


```
cd datastor
npm install             
node index.js
```

#### 5. Steps to run preprocessing(Data Aggregator) peer(Multiple peers of this type can be launched)

```
cd preprocessing
npm install             
node index.js
```

#### 6. Steps to run prediction peer(Multiple peers of this type can be launched)

```
cd prediction
npm install             
node index.js
```

#### 7. Steps to run notifier peer(Multiple peers of this type can be launched)

```
cd notifier
npm install             
node index.js
```

Note: Peers can be deployed across multiple Virtual Machines or in single Virtual Machine.

### Following videos contain Demo of our project that we showed to the professor:

- https://drive.google.com/file/d/120iG-Cm9BymU7Vq3KTrMSDreb3fkUSAR/view?usp=sharing
- https://drive.google.com/file/d/1VGdgFSJq1p7HGlaiauMCDlPVkvtubCxk/view?usp=sharing

### References:

- https://github.com/aws-samples/simple-nft-marketplace
- https://github.com/libp2p/js-libp2p
