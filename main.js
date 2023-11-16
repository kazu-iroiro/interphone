const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } = skyway_room;

window.onload = async function () {
    var Token = localStorage.getItem('Token');

    console.log(Token);
    if (Token != "") {
        console.log("Tokenをロードしました");
        await SkyWay_main(String(Token));
    } else {
        alert("認証情報を入力してください");
    }
}

async function IdKeySave() {
    const AppId = document.getElementById('App-id').value;
    const SecretKey = document.getElementById('Secret-key').value;
    var Token = document.getElementById('Token').value;

    if (AppId != "" && SecretKey != "") {
        Token = await SkyWay_MakeToken(AppId, SecretKey);
        await localStorage.setItem('Token', Token);
        console.log("保存済み");
        location.reload();
    } else {
        if (Token != "") {
            await localStorage.setItem('Token', Token);
            location.reload();
        } else {
            alert("認証情報を入力してください");
        }
    }
}

function SkyWay_MakeToken(AppId, SecretKey) {
    const token = new SkyWayAuthToken({
        jti: uuidV4(),
        iat: nowInSec(),
        exp: nowInSec() + 60 * 60 * 24 * 3,
        scope: {
            app: {
                id: AppId,
                turn: true,
                actions: ['read'],
                channels: [
                    {
                        id: '*',
                        name: '*',
                        actions: ['write'],
                        members: [
                            {
                                id: '*',
                                name: '*',
                                actions: ['write'],
                                publication: {
                                    actions: ['write'],
                                },
                                subscription: {
                                    actions: ['write'],
                                },
                            },
                        ],
                        sfuBots: [
                            {
                                actions: ['write'],
                                forwardings: [
                                    {
                                        actions: ['write'],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    }).encode(SecretKey);
    return token;
}

(async () => {
    const localVideo = document.getElementById('local-video');
    const buttonArea = document.getElementById('button-area');
    const remoteMediaArea = document.getElementById('remote-media-area');
    const roomNameInput = document.getElementById('room-name');

    const myId = document.getElementById('my-id');
    const joinButton = document.getElementById('join');


    joinButton.onclick = async () => {
        const { audio, video } =
            await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
        video.attach(localVideo);
        await localVideo.play();
        if (roomNameInput.value === '') return;

        var token = localStorage.getItem('Token');
        const context = await SkyWayContext.Create(token);
        const room = await SkyWayRoom.FindOrCreate(context, {
            type: 'p2p',
            name: roomNameInput.value,
        });
        const me = await room.join();

        myId.textContent = me.id;

        await me.publish(audio);
        await me.publish(video);

        const subscribeAndAttach = (publication) => {
            if (publication.publisher.id === me.id) return;

            const subscribeButton = document.createElement('button');
            subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
            buttonArea.appendChild(subscribeButton);

            subscribeButton.onclick = async () => {
                const { stream } = await me.subscribe(publication.id);

                let newMedia;
                switch (stream.track.kind) {
                    case 'video':
                        newMedia = document.createElement('video');
                        newMedia.playsInline = true;
                        newMedia.autoplay = true;
                        break;
                    case 'audio':
                        newMedia = document.createElement('audio');
                        newMedia.controls = true;
                        newMedia.autoplay = true;
                        break;
                    default:
                        return;
                }
                stream.attach(newMedia);
                remoteMediaArea.appendChild(newMedia);
            };
        };

        room.publications.forEach(subscribeAndAttach);
        room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
    };
})();