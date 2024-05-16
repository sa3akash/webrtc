
import express from 'express';
import http from "node:http";
import socket from 'socket.io'

const app = express();

const server = http.createServer(app);

server.listen(5000, ()=>console.log('server listening on port 5000'))

const io = new socket.Server(server,{
    cors: {origin: 'http://localhost:5173'}
})

const users:Record<string,string> = {}

io.on('connection',(socket)=>{
    console.log('user connected', socket.id)

    if(socket.handshake.auth?.user){
        users[socket.handshake.auth?.user] = socket.id;

        io.emit('all', {users: Object.keys(users)})


    }

    socket.on("call",(data)=>{
        console.log(data)
        socket.to(users[data.to]).emit("call",{signal:data.signal,to:data.from})
    })

    socket.on("ans",(data)=>{
        console.log(data)
        socket.to(data.to).emit("ans",data.answer)
    })


    socket.on("disconnect",()=>{
        console.log('user disconnected', socket.id)
        delete users[socket.handshake.auth?.user]
    })
})