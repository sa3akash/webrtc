import { useEffect, useRef, useState } from "react";
import "./App.css";
import io, { Socket } from "socket.io-client";
import Peer from "simple-peer";

function App() {
  const [socket, setSocket] = useState<Socket>();
  const [socketId, setSocketId] = useState<string | undefined>();
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [remoteStream, setRemoteStream] = useState<MediaStream>();
  const [username, setUsername] = useState<string>();
  const [allUsers, setAllUsers] = useState<string[]>();
  const [selectedUser, setSelectedUser] = useState<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [callData, setCallData] = useState<any>();

  const peerRef = useRef<Peer.Instance>();
  const userNameRef = useRef<HTMLInputElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = io("http://localhost:5000", {
      auth: {
        user: username,
      },
    });
    setSocket(socket);
    socket.on("connect", () => {
      setSocketId(socket.id);
      console.log("connected", socket.id);
    });
  }, [setSocketId, username]);

  const call = () => {
    enableMedia()
      .then((stream) => {
        setLocalStream(stream);
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: stream,
        });
        peer.on("signal", (data) => {
          console.log("signal call", data);

          socket?.emit("call", {
            signal: data,
            to: selectedUser,
            from: socketId,
          });
        });

        socket?.on("ans", (data) => {
          peer.signal(data);
          console.log("answer on", data);
        });

        peer.on("stream", (stream) => {
          setRemoteStream(stream);
          console.log("call stream", stream);
        });

        peerRef.current = peer;
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const enableMedia = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const ans = () => {
    enableMedia().then((stream) => {
      setLocalStream(stream);
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
      });

      peer.signal(callData.signal);

      peer.on("signal", (data) => {
        console.log(data);
        socket?.emit("ans", { answer: data, to: callData.to });
        console.log("answer emit", data);
      });

      peer.on("stream", (stream) => {
        setRemoteStream(stream);
        console.log("ans stream", stream);
      });
      peerRef.current = peer;
    });
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play();
    }
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play();
    }
  }, [remoteStream]);

  useEffect(() => {
    socket?.on("all", (data) => {
      setAllUsers(data.users);
    });

    socket?.on("call", (data) => {
      setCallData(data);
    });
  }, [socket]);

  const cancel = () => {
    if(localStream){
      localStream?.getTracks().forEach((track) => track.stop());

    }
    if (peerRef.current) {
      peerRef.current.destroy();
      setCallData(null);
      setLocalStream(undefined);
      setRemoteStream(undefined);
    }
    console.log('local stram',localStream)
    console.log('remote stram',remoteStream)
   
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <div>
          {allUsers?.map((data, index) => {
            return (
              <div>
                <span key={index}>{data}</span>
                <button onClick={() => setSelectedUser(data)}>select</button>
              </div>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="enter yout username"
          ref={userNameRef}
        />
        <button onClick={() => setUsername(userNameRef.current?.value)}>
          save
        </button>
      </div>
      {username && (
        <span>
          {username}/ {selectedUser}
        </span>
      )}
      <button onClick={call}>call</button>
      <button onClick={cancel}>cancel</button>
      {callData && <button onClick={ans}>ans</button>}
      <div style={{ display: "flex", gap: "10px" }}>
        <video ref={localVideoRef} style={{ flex: "1" }} width={400}></video>
        <video ref={remoteVideoRef} style={{ flex: "1" }} width={400}></video>
      </div>
    </div>
  );
}

export default App;
