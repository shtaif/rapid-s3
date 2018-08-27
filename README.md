- About Koa CORS...
- HTTP2 and fs.promises experimental APIs... (are they still in latest version?)
- Why I used HTTP2...
- Why I used Secured HTTP2...

Optional considerations if time would allow:
- Store the fixed users in a more realistic/appropriate location?
- Should do a full storedFilename field in FileModel instead of combining the file ID with the it's mimetype lookup?
- Ability to update a file (only using a PUT request)?
- Middleware piece to restrict a route only for form-data requests
- Enforcing atomicity in the update record in DB -> delete actual file compound operation...

Challenges I faced:
- Design the architecture in a way that file transfers will be as light (scalable) as possible, while relying on 3rd party libraries to minimize code.
- Cover and handle all collateral edge cases derived from the assignment specification.

If I had more time...
- Add a complete test suite with Jest.
- Separating the business layer from the actual storage layer - "Storage Adapter"...
- Refactor endpoints logic to minimize code and increase reusability since a lot of them share similar logic with slight variations.















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



##### Challenges I faced
- Design the architecture in a way that file transfers will be as light (***scalable***) as possible, while still relying on 3rd party libraries to minimize code. Wanted to make sure that an uploaded file is streamed directly to it's storage destination without additional moving / renaming operations for the best user experience.
- Cover and handle all possible collateral edge cases derived from the assignment specification.

##### If I had more time
- Would write a full test suite with Jest.
- Would separate the business layer from the actual storage layer by the means of a "Storage Adapter" - a predefined interface, perhaps implemented as an "abstract" class, to which all the REST endpoints will communicate. Such interface will receive the multipart streams from the request directly from the REST endpoints and will encapsulate the implementation details of the file storage. That will make the system more modular and reusable, as variable storage implementations can be easily swapped and connected, such as streaming out into a separate process with IPC, to a different server via a message queue, or even to some 3rd party service.
- Refactor endpoints logic to minimize code and increase reusability since a lot of them share similar logic with slight variations.

##### Important notes
- Major browsers decided to support HTTP2 only as Secured HTTP2 so far (and will probably keep it like that), therefore this program requires the TLS assets. Furthermore, I believe HTTP2 (even through https) should be standard due to it's benefits and rational, so this is way I've chosen to implement this project with it.
- Ignore the warning about the HTTP2 module, it is emitted from Node.js itself and will probably disappear in the couple next Node.js releases.
