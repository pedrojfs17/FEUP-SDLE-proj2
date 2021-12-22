package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"
	discovery "github.com/libp2p/go-libp2p-discovery"
)

// UserSubscriptionBufSize is the number of incoming messages to buffer for each topic.
const UserSubscriptionBufSize = 128

// User represents a user to a single PubSub topic. Messages
// can be published to the topic with User.Post, and received
// messages are pushed to the Messages channel.
type User struct {
	// Messages is a channel of messages received from other peers in the chat room
	Messages chan *Message

	ctx              context.Context
	h                host.Host
	routingDiscovery *discovery.RoutingDiscovery

	history       map[time.Time]*Message
	subscriptions map[string]map[time.Time]*Message

	user string
	self peer.ID
}

// Message gets converted to/from JSON and sent in the body of pubsub messages.
type Message struct {
	Message    string
	SenderID   string
	SenderNick string
	Time       time.Time
}

// CreateUser tries to create a User
func CreateUser(ctx context.Context, h host.Host, routingDiscovery *discovery.RoutingDiscovery, user string) (*User, error) {

	usr := &User{
		ctx:      ctx,
		h:        h,
		self:     h.ID(),
		history: make(map[time.Time]*Message, 0),
		subscriptions: make(map[string]map[time.Time]*Message, 0),
		routingDiscovery: routingDiscovery,
		user:     user,
		Messages: make(chan *Message, UserSubscriptionBufSize),
	}
	return usr, nil
}

// Post sends a message to the pubsub topic.
func (user *User) Post(message string) Message {
	t := time.Now().UTC()
	m := Message{
		Message:    message,
		SenderID:   user.self.Pretty(),
		SenderNick: user.user,
		Time:       t,
	}
	user.history[t] = &m
	go user.Communicate(user.user,false)
	go user.DeleteMessage(m)
	return m
}

func (user *User) DeleteMessage(m Message) {
	if user.user == m.SenderNick {
		time.Sleep(1 * time.Hour)
		delete(user.history, m.Time)
	} else {
		time.Sleep(1 * time.Minute)
		delete(user.subscriptions[m.SenderNick], m.Time)
	}

}

func (user *User) ListPeers() []string {
	subs := make([]string, 0)
	for sub := range user.subscriptions {
		subs = append(subs, sub)
	}
	return subs
}

func (ur *User) Communicate(user string, read bool) {
	peerChan, err := ur.routingDiscovery.FindPeers(ur.ctx, user)
	if err != nil {
		panic(err)
	}
	// TODO: Fix advertise, not finding other peers that are advertising
	for peer := range peerChan {
		fmt.Printf("Found peer:", peer.ID.Pretty(), " have id: ", ur.h.ID().Pretty(), "\n")
		if peer.ID == ur.h.ID() {
			continue
		}

		fmt.Println("Connecting to:", peer)
		stream, err := ur.h.NewStream(ur.ctx, peer.ID, protocol.ID("/chat/1.1.0"))

		if err != nil {
			fmt.Println("Connection failed:", err)
			continue
		} else {
			fmt.Println("Connected to:", peer)
			if read {
				r := bufio.NewReader(bufio.NewReader(stream))
				go ur.readTimeline(r, user)
				break
			} else {
				w := bufio.NewWriter(bufio.NewWriter(stream))
				b, err := json.Marshal(ur.history)
				if err != nil {
					panic(err)
				}
				go ur.writeTimeline(w, b)
			}
			
		}
	}

}

func (ur *User) readTimeline(r *bufio.Reader, user string) {
	b, err := r.ReadBytes(0)
	if err != nil {
		panic(err)
	}
	t := new(map[time.Time]*Message)
	err = json.Unmarshal(b, t)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Received ", t)

	ur.subscriptions[user] = *t

}

func (ur *User) writeTimeline(w *bufio.Writer, obj []byte) {
	_, err := w.Write(obj)
	if err != nil {
		panic(err)
	}

}
