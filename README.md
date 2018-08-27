# Rapid-S3
Rapid-S3 - Alternative object storage API to Amazon S3
___


### Software Stack
- Node.js
- The Koa framework stack
- MongoDB + Mongoose ORM/driver
- Multer for upload handling (wraps Busboy as the multipart request parser).



### Installation
Clone repository:
```bash
git clone https://github.com/shtaif/rapid-s3.git
cd rapid-s3
```
Install dependencies:
```bash
npm install
```
Rapid-S3 is configured based on the following environment variables:
- `RS3_DB_URI` - the MongoDB URI to connect to - **required**
- `RS3_TLS_KEY_PATH` - path for a TLS key file - **required**
- `RS3_TLS_CERT_PATH` - path for a TLS cert file - **required**
- `RS3_PORT` - port to listen on - **optional, defaults to `4443`**
- `RS3_STORAGE_DIR` - path to store the uploaded files in - **optional, defaults to `./storage` (directory is automatically created if not exists)**

To do this easily, the project supports a `.env` file being at the projects' root.
Example of a minimal `.env`  file:
```bash
RS3_DB_URI=mongodb://localhost:27017/rs3
RS3_TLS_KEY_PATH=../server.key
RS3_TLS_CERT_PATH=../server.cert
```


### Running
The program is started via the standard `start` script:
```bash
npm start
```
App is ready when the message `Secure HTTP2 server running on <SOME_PORT>` is displayed in terminal.
If running on `localhost` with default port, the app's base URL should be available at **https://localhost:4443**.


##### Important notes
- Major browsers decided to support HTTP2 only as Secured HTTP2 so far (and will probably keep it like that), therefore this program requires the TLS assets. Additionally, I believe HTTP2 (even through https) should be standard due to it's benefits and rational, so that's why I've chosen to implement this project with it.
