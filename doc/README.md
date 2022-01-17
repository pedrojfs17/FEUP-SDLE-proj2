# Project 2 - Distributed Timeline

## Instalation

This project was built using [React](https://reactjs.org/), [Node.js](https://nodejs.org/en/), [Express](https://expressjs.com/) and [libp2p](https://libp2p.io/). Please use the [NPM](https://www.npmjs.com/) to install all project dependencies.

Run the following command from the `src/backend`, `src/frontend` and `src/bootstrap` folders:

```
npm install
```

## Compilation

In order to compile the bootstrap peers code, please run the following command from the `src/bootstrap` folder:

```
docker-compose build
```

In order to compile the peer source code, please run the following command from the `src` folder:

```
docker-compose build
```

An optional `-f docker-compose-test.yml` can be added before `build` to build three peers for testing in local environment.

## Execution

### Bootstrap Peers

In order to start the bootstrap peers please run the following command from the `src/bootstrap` folder:

```
docker-compose up
```

### Peers

After initializing bootstrap peers, and in order to start the peers please create a `.env` file with the following content:

```
REACT_APP_FRONTEND_PORT=<frontend_port>
REACT_APP_BACKEND_PORT=<backend_port>
BOOTSTRAP_IP=<bootstrap_ip>
ITEMS_PER_USER=<items_per_user>
EXPIRATION_TIME=<expiration_time>
```

with:
- <frontend_port> : The port to use in frontend (e.g. 3000)
- <backend_port> : The port to use in backend (e.g. 3001)
- <bootstrap_ip> : IP of the bootstrap peers (e.g. 127.0.0.1)
- <items_per_user> : Number of timeline posts the peer will save for each user it follows (e.g. 100)
- <expiration_time> : Time limit (in seconds) where posts posted longer than that time will be deleted (e.g. 86400000)

After creating the `.env` file, please run the following command from the `src` folder:

```
docker-compose up
```

An optional `-f docker-compose-test.yml` can be added before `up` to run three peers for testing in local environment (Note that this three peers have ports 3000 and 3001, 4000 and 4001, 5000 and 5001 for frontend and backend respectively).

After peers are running, please join `https://localhost:<frontend_port>`.