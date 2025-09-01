const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const rooms = {};
// roomId -> { name, lamps, litCount, lampStates[], litBy:Set }

app.post("/api/create-room", (req, res) => {
    const { name, lampCount } = req.body;
    const roomId = Math.random().toString(36).substr(2, 6);

    rooms[roomId] = {
        name,
        lamps: lampCount,
        litCount: 0,
        lampStates: Array(lampCount).fill(false),
        litBy: new Set(),
    };

    res.json({
        participantLink: `/room.html?roomId=${roomId}&role=participant`,
        chiefGuestLink: `/room.html?roomId=${roomId}&role=chief`,
    });
});

io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId }) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            socket.emit("room-data", rooms[roomId]);
        }
    });

    socket.on("light-lamp", ({ roomId }) => {
        if (!roomId || !rooms[roomId]) return;
        const room = rooms[roomId];

        if (room.litBy.has(socket.id)) {
            socket.emit("error-message", { msg: "You already lit a lamp!" });
            return;
        }

        const index = room.lampStates.indexOf(false);
        if (index === -1) {
            socket.emit("error-message", { msg: "All lamps are already lit!" });
            return;
        }

        room.lampStates[index] = true;
        room.litCount++;
        room.litBy.add(socket.id);

        io.to(roomId).emit("lamp-lit", { lampIndex: index });
    });
});

const PORT = 3000;
server.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);
