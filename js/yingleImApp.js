/**
 * 赢了网实时通信系统
 * Created by pengyanhua on 2016/03/23
 */
var yingleImApp = function (pageId, customId, lawyerId) {

    // AppId
    var appId = 'X2UogMH6UVTkPJjHDfuPLhIF-gzGzoHsz';

    // 服务端生成
    var roomId = '';

    // 页面id
    var pageId = pageId;

    // 客户id
    var customId = customId;

    // 律师id
    var lawyerId = lawyerId;

    // 定义新的id
    var clientId, memberId, memberName;

    // 用来存储 realtimeObject
    var rt;

    // 用来存储创建好的 roomObject
    var room;

    // 监听是否服务器连接成功
    var firstFlag = true;

    // 用来标记历史消息获取状态
    var logFlag = false;

    // buttons
    //var inputName = document.getElementById('input-name');
    var inputSend = document.getElementById('input-send');
    var printWall = document.getElementById('print-wall');

    // 拉取历史相关
    // 最早一条消息的时间戳
    var msgTime;

    //点击链接和发送事件
    $('#send-btn').on('click', sendMsg);

    //Custom端
    $('#lawyerList a').on('click', function () {
        pageId = $('.pageId').attr('id');
        customId = $('.customId').attr('id');
        lawyerId = $(this).attr('id');
        clientId = customId + '-' + pageId;
        memberId = lawyerId;
        memberName = $(this).attr('data');
        main();
    });

    //Lawyer端
    $('#customList a').on('click', function () {
        pageId = $('.pageId').attr('id');
        lawyerId = $('.lawyerId').attr('id');
        customId = $(this).attr('id');
        clientId = lawyerId;
        memberId = customId + '-' + pageId;
        memberName = $(this).attr('data');
        main();
    });

    bindEvent(document.body, 'keydown', function (e) {
        if (e.keyCode === 13) {
            if (!firstFlag) {
                sendMsg();
            }
        }
    });


    // 连接服务器
    function main() {
        console.log('正在连接服务器，请等待。。。');
        console.log(pageId);
        console.log(customId);
        console.log(lawyerId);
        console.log(clientId);
        console.log(firstFlag);

        if (!firstFlag) {
            rt.close();
        }

        // 创建实时通信实例
        rt = AV.realtime({
            appId: appId,
            clientId: clientId,

            // secure 设置为 false 为了兼容IE8、IE9。
            secure: false
        });

        // 监听状态
        rt.on('close', function () {
            console.log('已与服务器断开！');
        });

        // 监听连接成功事件
        rt.on('open', function () {
            firstFlag = false;
            console.log('服务器连接成功！');

            // 获得已有房间的实例
            rt.room(roomId, function (object) {

                // 判断服务器端是否存在这个 room，如果存在
                if (object) {
                    room = object;

                    // 当前用户加入这个房间
                    room.join(function () {

                        // 获取成员列表
                        room.list(function (data) {
                            console.log('当前 Conversation 的成员列表：', data);

                            // 获取在线的 client（Ping 方法每次只能获取 20 个用户在线信息）
                            rt.ping(data.slice(0, 20), function (list) {
                                console.log('当前在线的成员列表：', list);
                            });

                            var l = data.length;

                            // 如果超过 500 人，就踢掉一个。
                            if (l > 490) {
                                room.remove(data[30], function () {
                                    console.log('人数过多，踢掉： ', data[30]);
                                });
                            }

                            // 获取聊天历史
                            getLog(function () {
                                printWall.scrollTop = printWall.scrollHeight;
                                showLog('您已经加入，可以开始对话了。');
                            });
                        });

                    });

                    // 房间接受消息
                    room.receive(function (data) {
                        if (!msgTime) {
                            // 存储下最早的一个消息时间戳
                            msgTime = data.timestamp;
                        }
                        showMsg(data);
                    });
                } else {
                    // 如果服务器端不存在这个 conversation
                    console.log('服务器不存在这个 conversation，你需要创建一个。');

                    // 创建一个新 room
                    rt.room({
                        // Room 的默认名字
                        name: '赢了网',

                        // 默认成员的 clientId
                        members: [
                            // 当前用户
                            clientId, memberId
                        ],
                        // 创建暂态的聊天室（暂态聊天室支持无限人员聊天，但是不支持存储历史）
                        // transient: true,
                        // 默认的数据，可以放 Conversation 名字等
                        attr: {
                            pageId: pageId,
                            customId: customId,
                            lawyerId: lawyerId
                        },
                        unique: true
                    }, function (obj) {

                        // 创建成功，后续你可以将 room id 存储起来
                        room = obj;
                        roomId = room.id;
                        console.log('创建一个新 Room 成功，id 是：', roomId);

                        // 关闭原连接，重新开启新连接
                        rt.close();
                        main();
                    });
                }
            });
        });

        // 监听服务情况
        rt.on('reuse', function () {
            console.log('服务器正在重连，请耐心等待。。。');
        });

        // 监听错误
        rt.on('error', function () {
            console.log('连接遇到错误。。。');
        });
    }


    // 发送信息
    function sendMsg() {

        // 如果没有连接过服务器
        if (firstFlag) {
            alert('请先连接服务器！');
            return;
        }
        var val = inputSend.value;

        // 不让发送空字符
        if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
            alert('请输入点文字！');
        }

        // 向这个房间发送消息，这段代码是兼容多终端格式的，包括 iOS、Android、Window Phone
        room.send({
            text: val
        }, {
            type: 'text'
        }, function (data) {

            // 发送成功之后的回调
            inputSend.value = '';
            showLog(formatTime(data.t) + '<br/>' + '自己： ', val);
            printWall.scrollTop = printWall.scrollHeight;
        });

        // 发送多媒体消息
        // room.send({
        //     text: '图片测试',
        //     // 自定义的属性
        //     attr: {
        //         a: 123
        //     },
        //     url: 'https://leancloud.cn/images/static/press/Logo%20-%20Blue%20Padding.png',
        //     metaData: {
        //         name: 'logo',
        //         format: 'png',
        //         height: 123,
        //         width: 123,
        //         size: 888
        //     }
        // }, {
        //     type: 'image'
        // }, function (data) {
        //     //console.log('图片数据发送成功！');
        // });
    }

    // 显示接收到的信息
    function showMsg(data, isBefore) {
        var text = '';
        var from = data.fromPeerId;
        if (data.msg.type) {
            text = data.msg.text;
        } else {
            text = data.msg;
        }
        if (data.fromPeerId === clientId) {
            from = '自己';
        } else {
            from = memberName;
        }
        if (String(text).replace(/^\s+/, '').replace(/\s+$/, '')) {
            showLog(formatTime(data.timestamp) + '<br/>' + encodeHTML(from) + '： ', text, isBefore);
        }
    }

    // 拉取历史
    bindEvent(printWall, 'scroll', function (e) {
        if (printWall.scrollTop < 20) {
            getLog();
        }
    });

    // 获取消息历史
    function getLog(callback) {
        var height = printWall.scrollHeight;
        if (logFlag) {
            return;
        } else {
            // 标记正在拉取
            logFlag = true;
        }
        room.log({
            t: msgTime
        }, function (data) {
            logFlag = false;
            // 存储下最早一条的消息时间戳
            var l = data.length;
            if (l) {
                msgTime = data[0].timestamp;
            }
            for (var i = l - 1; i >= 0; i--) {
                showMsg(data[i], true);
            }
            if (l) {
                printWall.scrollTop = printWall.scrollHeight - height;
            }
            if (callback) {
                callback();
            }
        });
    }

    // demo 中输出代码
    function showLog(msg, data, isBefore) {
        if (data) {
            // console.log(msg, data);
            msg = msg + '<span class="strong">' + encodeHTML(JSON.stringify(data)) + '</span>';
        }
        var p = document.createElement('p');
        p.innerHTML = msg;
        if (isBefore) {
            printWall.insertBefore(p, printWall.childNodes[0]);
        } else {
            printWall.appendChild(p);
        }
    }

    function encodeHTML(source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        // .replace(/\\/g,'&#92;')
        // .replace(/"/g,'&quot;')
        // .replace(/'/g,'&#39;');
    }

    function formatTime(time) {
        var date = new Date(time);
        var month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
        var currentDate = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
        var hh = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
        var mm = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
        var ss = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
        return date.getFullYear() + '-' + month + '-' + currentDate + ' ' + hh + ':' + mm + ':' + ss;
    }

    function bindEvent(dom, eventName, fun) {
        if (window.addEventListener) {
            dom.addEventListener(eventName, fun);
        } else {
            dom.attachEvent('on' + eventName, fun);
        }
    }

    return {
        //pageId: pageId,
        //customId: customId,
        //lawyerId: lawyerId,
        init: function () {
            main();
        }
    }
}();