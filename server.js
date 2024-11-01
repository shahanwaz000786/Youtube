const http = require("http");
const app = require("./Youtube/app");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  // Use server.listen instead of app.listen
  console.log(`Server running on port ${PORT}`);
});
