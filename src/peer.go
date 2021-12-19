package main

import (
	"time"
	"fmt"
	//"strings"
)

type Peer struct {
	id string
	messages map[time.Time]string
	subscribed []string
	timelines map[string]map[time.Time]string// idPeer -> timeline
}

func newPeer(id string) Peer {
	return Peer{id, make(map[time.Time]string), make([]string,0), make(map[string]map[time.Time]string)}
}

func (peer *Peer) deleteMessage(msgtime time.Time) {
	time.Sleep(10*time.Minute)
	delete(peer.messages,msgtime)
}

func (peer *Peer) pub(message string) {
	var time = time.Now().UTC()
	peer.messages[time] = message
	go peer.deleteMessage(time)
}


func (peer *Peer) getSelfTimeline() (string, map[time.Time]string){

	return peer.id, peer.messages
}

func (peer *Peer) getTimeline(peerID string) map[time.Time]string{
	return peer.timelines[peerID]
}
 
func (peer *Peer) sub(id string, subbed Peer) {
	id, timeline:=subbed.getSelfTimeline()
	peer.timelines[id]= timeline
}

func (peer *Peer) printTimeline(){
	fmt.Println("---Messages---")
	for timeMsg, message := range peer.messages {
		fmt.Printf("%d\x1b[32m%s\x1b[0m> ", timeMsg, message)
	}
	
}






