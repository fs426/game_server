//BACKEND

//CROS 방지로 직접 ip 주소를 적어넣는 방법을 이용함, 따라서 매번 주소 바꿀 필요 있음
//server running is 'npm run dev' btw if you forget

//socket creating 
const { rejects } = require("assert");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const loadMap = require("./mapLoader.js");
const SPEED = 5;
const ARROW_SPEED = 30;
const TICK_RATE = 60;


let players = [];
let arrows = [];
const inputsMap = {};

function tick(delta) {
  for (const player of players) {
    const inputs = inputsMap[player.id];
    if (inputs.up) {
      player.y -= SPEED
    } else if (inputs.down) {
      player.y += SPEED
    }
    if (inputs.right) {
      player.x += SPEED
    } else if (inputs.left) {
      player.x -= SPEED
    }
  }

  for (const arrow of arrows) {
    arrow.x += Math.cos(arrow.angle) * ARROW_SPEED;
    arrow.y += Math.sin(arrow.angle) * ARROW_SPEED;
    arrow.timeLeft -= delta;
    for (const player of players) {
      if (player.id === arrow.playerId) continue;
      const distance = Math.sqrt(((player.x + 20) - (arrow.x + 11)) ** 2 + ((player.y + 20) - (arrow.y + 3)) ** 2);
      if (distance <= 20) {
        player.x = 0;
        player.y = 0;
        arrow.timeLeft = -1;
        break;
      }

    }

  }

  arrows = arrows.filter((arrow) => arrow.timeLeft > 0)

  io.emit("players", players);
  io.emit("arrows", arrows);
};


async function main() { //map loading(takes a long time,so use a promise method)
  const map2D = await loadMap()
  //console.log(map2D)
  io.on("connect", (socket) => {
    console.log("user connected", socket.id);

    inputsMap[socket.id] = {
      'up': false,
      'down': false,
      'left': false,
      'right': false
    };

    players.push({
      id: socket.id,
      x: 0,
      y: 0,
    });

    socket.emit('map', map2D);

    socket.on('inputs', (inputs) => {
      inputsMap[socket.id] = inputs;
    });

    socket.on('arrow', (angle) => {
      const player = players.find(player => player.id === socket.id)
      arrows.push({
        angle,
        x: player.x + 20,
        y: player.y + 20,
        timeLeft: 1000,
        playerId: socket.id
      })
    })

    socket.on("disconnect", () => {
      players = players.filter((player) => player.id !== socket.id);
    })


  });



  app.use(express.static("public"));

  httpServer.listen(5000, () => { console.log("server running") });

  let lastUpdate = Date.now();
  setInterval(() => {
    const now = Date.now();
    const delta = now - lastUpdate;
    tick(delta);
    lastUpdate = now
  }, 1000 / TICK_RATE);
}

main();
