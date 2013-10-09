
help :
	@echo "please specific a task : [IIIPCrawler | server]"

EMPTY := 
SPACE := $(EMPTY) $(EMPTY)

SHARE_SRCS = $(SPACE)http_agent.js worker.js fetcher.js tools.js
SHARE_SRCS_PATH = $(subst $(SPACE), src/server/,$(SHARE_SRCS))

IIIPCrawler : src/IIIPCrawler/* $(SHARE_SRCS_PATH)
	mkdir -p IIIPCrawler
	-cp $? IIIPCrawler/


	
SERVER_SRCS := $(SPACE)http_agent.js batch_operator.js crawler.js fetcher.js slave.js tools.js chromeServer.js delay_operator.js handlers.js server.js worker.js cookie.js
SERVER_SRCS_PATH = $(subst $(SPACE), src/server/,$(SERVER_SRCS))

server : bin/package.json server_srcs 
	
server_srcs : $(SERVER_SRCS_PATH)
	mkdir -p bin
	cp $? bin/	

bin/package.json : src/server/package.json
	mkdir -p bin
	cp $? bin/
	cd bin && npm install -l
	
clean :
	-rm -rf bin IIIPCrawler
