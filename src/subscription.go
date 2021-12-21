package main

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/libp2p/go-libp2p-core/peer"

	pubsub "github.com/libp2p/go-libp2p-pubsub"
)

// UserSubscriptionBufSize is the number of incoming messages to buffer for each topic.
const UserSubscriptionBufSize = 128

// UserSubscription represents a subscription to a single PubSub topic. Messages
// can be published to the topic with UserSubscription.Publish, and received
// messages are pushed to the Messages channel.
type UserSubscription struct {
	// Messages is a channel of messages received from other peers in the chat room
	Messages chan *Message

	ctx   context.Context
	ps    *pubsub.PubSub
	topic *pubsub.Topic
	sub   *pubsub.Subscription

	user string
	self peer.ID
	nick string
}

// Message gets converted to/from JSON and sent in the body of pubsub messages.
type Message struct {
	Message    string
	SenderID   string
	SenderNick string
	Time       time.Time
}

// SubscribeUser tries to subscribe to the PubSub topic for the user name, returning
// a UserSubscription on success.
func SubscribeUser(ctx context.Context, ps *pubsub.PubSub, selfID peer.ID, nickname string, user string) (*UserSubscription, error) {
	// join the pubsub topic
	topic, err := ps.Join(topicName(user))
	if err != nil {
		return nil, err
	}

	// and subscribe to it
	sub, err := topic.Subscribe()
	if err != nil {
		return nil, err
	}

	subscription := &UserSubscription{
		ctx:      ctx,
		ps:       ps,
		topic:    topic,
		sub:      sub,
		self:     selfID,
		nick:     nickname,
		user:     user,
		Messages: make(chan *Message, UserSubscriptionBufSize),
	}

	// start reading messages from the subscription in a loop
	go subscription.readLoop()
	return subscription, nil
}

// Publish sends a message to the pubsub topic.
func (subscription *UserSubscription) Publish(message string) error {
	if subscription.user != subscription.nick {
		return errors.New("tried publishing to different timeline")
	}
	m := Message{
		Message:    message,
		SenderID:   subscription.self.Pretty(),
		SenderNick: subscription.nick,
		Time:       time.Now().UTC(),
	}
	msgBytes, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return subscription.topic.Publish(subscription.ctx, msgBytes)
}

func (subscription *UserSubscription) ListPeers() []peer.ID {
	return subscription.ps.ListPeers(topicName(subscription.user))
}

// readLoop pulls messages from the pubsub topic and pushes them onto the Messages channel.
func (subscription *UserSubscription) readLoop() {
	for {
		msg, err := subscription.sub.Next(subscription.ctx)
		if err != nil {
			close(subscription.Messages)
			return
		}
		// only forward messages delivered by others
		if msg.ReceivedFrom == subscription.self {
			continue
		}
		cm := new(Message)
		err = json.Unmarshal(msg.Data, cm)
		if err != nil {
			continue
		}
		// send valid messages onto the Messages channel
		subscription.Messages <- cm
	}
}

func topicName(user string) string {
	return "chat-room:" + user
}
