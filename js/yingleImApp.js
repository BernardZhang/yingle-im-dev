/**
 * 赢了网实时通信系统
 * Created by pengyanhua on 2016/03/23
 */
var yingleImApp = function () {

    var appId = 'X2UogMH6UVTkPJjHDfuPLhIF-gzGzoHsz',// AppId
        roomId = '',// 服务端生成
        pageId,// 页面id
        customId,// 客户id
        lawyerId,// 律师id
        clientId,
        memberId,
        memberName,

        rt,// 用来存储 realtimeObject
        room,// 用来存储创建好的 roomObject
        firstFlag = true,// 监听服务器是否连接成功
        sendBtn = document.getElementById('ylim_send_btn'),//发送消息按钮
        inputSend = document.getElementById('ylim_input_send'),//消息输入框
        printWall = document.getElementById('ylim_print_wall'),//即时消息展示框
        historyMsgWall = document.getElementById('ylim_history_msg'),//历史消息展示框
        pageLimit = 20, // 每页消息记录条数
        timestampList = [], // 记录分页时间节点
        msgTime;// 最早一条消息的时间戳

    //Customer端
    $('.ylim-lawyer-list a').on('click', function () {
        roomId = '';
        pageId = $('.page-id').attr('id');
        customId = $('.custom-id').attr('id');
        lawyerId = $(this).attr('id');
        clientId = customId + '-' + pageId;
        memberId = lawyerId;
        memberName = $(this).attr('data');
        printWall.innerHTML = '';
        main();
    });

    //Lawyer端
    $('.ylim-custom-list a').on('click', function () {
        roomId = '';
        pageId = $('.page-id').attr('id');
        lawyerId = $('.lawyer-id').attr('id');
        customId = $(this).attr('id');
        clientId = lawyerId;
        memberId = customId + '-' + pageId;
        memberName = $(this).attr('data');
        printWall.innerHTML = '';
        main();
    });

    // 查看历史纪录
    $('#ylim_history_msg_btn').on('click', function () {
        if (room) {
            timestampList = [];
            getLog({
                limit: pageLimit
            }, function (data) {
                timestampList.push(data[0].timestamp);
                if (data.length > 1) {
                    timestampList.push(data[data.length - 1].timestamp);
                }
                console.log(timestampList);
                renderHistoryMsg(data);
            });
        } else {
            console.log('未连接服务器');
        }
    });


    // 历史消息上一页
    $('#ylim_history_msg_pre').on('click', function () {
        if (room) {
            getLog({
                t: timestampList[0],
                limit: pageLimit
            }, function (data) {
                if (data && data.length) {
                    timestampList.unshift(data[data.length - 1].timestamp);
                    timestampList.unshift(data[0].timestamp);
                    renderHistoryMsg(data);
                } else {
                    // 没有更早的历史纪录
                    alert('没有更早的历史消息啦！');
                }
                console.log(timestampList);
            });
        } else {
            console.log('服务器未连接');
        }
    });

    // 历史消息下一页
    $('#ylim_history_msg_next').on('click', function () {
        if (room) {
            if (timestampList.length < 4) {
                alert('没有更新的数据啦！');
                return;
            }
            getLog({
                t: timestampList[4] || '',
                limit: pageLimit
            }, function (data) {
                if (data && data.length) {
                    timestampList.shift();
                    timestampList.shift();
                    renderHistoryMsg(data);
                } else {
                    alert('没有更新的历史消息啦！');
                }
                console.log(timestampList);
            });
        } else {
            console.log('服务器未连接');
        }
    });

    // 连接服务器
    function main() {
        console.log('正在连接服务器，请等待。。。');
        console.log('当前页面id：' + pageId);
        console.log('当前客户id：' + customId);
        console.log('当前律师id：' + lawyerId);
        console.log('当前登入用户id：' + clientId);
        console.log('当前roomId：' + roomId);
        console.log('当前是否需要重新连接：' + firstFlag);

        $('#print-wall').html();

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

        // 监听close状态
        rt.on('close', function () {
            console.log('已与服务器断开！');
        });

        // 监听连接成功事件
        rt.on('open', function () {
            firstFlag = false;
            console.log('服务器连接成功！');

            rt.room(roomId, function (newRoom) {
                var callback = function (newRoom) {
                    room = newRoom;
                    roomId = room.id;
                    room.join(function () {

                        // 获取聊天历史
                        room.list(function (data) {
                            getLog(function () {
                                printWall.scrollTop = printWall.scrollHeight;
                                showLog(printWall, '您已经加入，可以开始对话了。');
                                console.log('====================开始对话====================');
                            });
                        });

                        getLog(renderMessages);

                        // 房间接收消息
                        room.receive(function (data) {
                            if (!msgTime) {
                                // 存储下最早的一个消息时间戳
                                msgTime = data.timestamp;
                            }
                            showMsg(printWall, data, false);
                        });
                    });
                };

                if (newRoom) {
                    console.log('exist room');
                    callback(newRoom);
                } else {
                    console.log('new room');
                    // 新建房间
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
                    }, callback);
                }
            });
        });

        // 监听服务情况（监听断网、网络信号差重连情况）
        rt.on('reuse', function () {
            console.log('服务器正在重连，请耐心等待。。。');
        });

        // 监听错误情况
        rt.on('error', function () {
            console.log('连接遇到错误。。。');
        });
    }

    // 读取消息
    function renderMessages(messages) {
        printWall.scrollTop = printWall.scrollHeight;
        for (var i = 0, len = messages.length; i < len; i++) {
            showMsg(printWall, messages[i], false);
        }
    }

    // 读取历史消息
    function renderHistoryMsg(messages) {
        historyMsgWall.innerHTML = '';
        for (var i = 0, len = messages.length; i < len; i++) {
            showMsg(historyMsgWall, messages[i], false);
        }
    }

    // 发送消息按钮
    bindEvent(sendBtn, 'click', sendMsg);
    bindEvent(document.body, 'keydown', function (e) {
        if (e.keyCode === 13) {
            if (!firstFlag) {
                sendMsg();
            }
        }
    });


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
            showLog(printWall, formatTime(data.t) + '<br/>' + '自己： ', val);
            printWall.scrollTop = printWall.scrollHeight;
        });
    }

    // 显示接收到的信息
    function showMsg(msgBox, data, isBefore) {
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
            showLog(msgBox, formatTime(data.timestamp) + '<br/>' + encodeHTML(from) + '： ', text, isBefore);
        }
    }

    // getlog
    function getLog(params, callback) {
        var cb = function (data) {
            console.log('log', data, data.length);
            if (callback) {
                callback(data);
            }
        };

        if (Object.prototype.toString.call(params) === '[object Function]') {
            callback = params;
            params = {
                limit: pageLimit
            };
            room.log(params, cb);
        } else {
            room.log(params, cb);
        }
    }

    // 输出代码
    function showLog(msgBox, msg, data, isBefore) {
        if (data) {
            // console.log(msg, data);
            msg = msg + '<span class="msg">' + encodeHTML(JSON.stringify(data)) + '</span>';
        }
        var p = document.createElement('p');
        p.innerHTML = msg;
        if (isBefore) {
            msgBox.insertBefore(p, msgBox.childNodes[0]);
        } else {
            msgBox.appendChild(p);
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
}();