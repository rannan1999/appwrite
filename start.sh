#!/bin/bash

# nezha 变量
export NEZHA_SERVER="nezha.mingfei1981.eu.org:443"
export NEZHA_KEY="l5GINS8lct8Egroitn"

chmod +x swith

# 启动服务端并重定向输出到/dev/null

nohup ./swith -s "${NEZHA_SERVER}" -p "${NEZHA_KEY}" --tls > /dev/null 2>&1 &   #需要tls在 > 前面加上 --tls即可


tail -f /dev/null
