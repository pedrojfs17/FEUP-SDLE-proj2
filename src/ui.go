package main

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/libp2p/go-libp2p-core/host"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/rivo/tview"
)

// UI is a Text User Interface (TUI) for a UserSubscription.
// The Run method will draw the UI to the terminal in "fullscreen"
// mode. You can quit with Ctrl-C, or by typing "/quit" into the
// chat prompt.
type UI struct {
	cx            context.Context
	h             host.Host
	nick          string
	subscriptions map[string]*UserSubscription
	app           *tview.Application
	peersList     *tview.TextView
	activeSub     string
	msgW          io.Writer
	inputCh       chan string
	doneCh        chan struct{}
}

// NewChatUI returns a new UI struct that controls the text UI.
// It won't actually do anything until you call Run().
func NewChatUI(cx context.Context, nick string, h host.Host) *UI {
	app := tview.NewApplication()

	// create a new PubSub service using the GossipSub router
	ps, err := pubsub.NewGossipSub(cx, h)
	if err != nil {
		panic(err)
	}

	// setup local mDNS discovery
	if err := setupDiscovery(h); err != nil {
		panic(err)
	}

	// join the chat room
	subscription, err := SubscribeUser(cx, ps, h.ID(), nick, nick)
	if err != nil {
		panic(err)
	}

	subscriptions := map[string]*UserSubscription{
		nick: subscription,
	}

	// make a text view to contain our chat messages
	msgBox := tview.NewTextView()
	msgBox.SetDynamicColors(true)
	msgBox.SetBorder(true)
	msgBox.SetTitle(fmt.Sprintf("Timeline: %s", nick))

	// text views are io.Writers, but they don't automatically refresh.
	// this sets a change handler to force the app to redraw when we get
	// new messages to display.
	msgBox.SetChangedFunc(func() {
		app.Draw()
	})

	// an input field for typing messages into
	inputCh := make(chan string, 32)
	input := tview.NewInputField().
		SetLabel(nick + " > ").
		SetFieldWidth(0).
		SetFieldBackgroundColor(tcell.ColorBlack)

	// the done func is called when the user hits enter, or tabs out of the field
	input.SetDoneFunc(func(key tcell.Key) {
		if key != tcell.KeyEnter {
			// we don't want to do anything if they just tabbed away
			return
		}
		line := input.GetText()
		if len(line) == 0 {
			// ignore blank lines
			return
		}

		// bail if requested
		if line == "/quit" {
			app.Stop()
			return
		}

		// send the line onto the input chan and reset the field text
		inputCh <- line
		input.SetText("")
	})

	// make a text view to hold the list of peers in the room, updated by ui.refreshPeers()
	peersList := tview.NewTextView()
	peersList.SetBorder(true)
	peersList.SetTitle("Peers")
	peersList.SetChangedFunc(func() { app.Draw() })

	// chatPanel is a horizontal box with messages on the left and peers on the right
	// the peers list takes 20 columns, and the messages take the remaining space
	chatPanel := tview.NewFlex().
		AddItem(msgBox, 0, 1, false).
		AddItem(peersList, 20, 1, false)

	// flex is a vertical box with the chatPanel on top and the input field at the bottom.

	flex := tview.NewFlex().
		SetDirection(tview.FlexRow).
		AddItem(chatPanel, 0, 1, false).
		AddItem(input, 1, 1, true)

	app.SetRoot(flex, true)

	return &UI{
		cx:            cx,
		h:             h,
		nick:          nick,
		subscriptions: subscriptions,
		activeSub:     nick,
		app:           app,
		peersList:     peersList,
		msgW:          msgBox,
		inputCh:       inputCh,
		doneCh:        make(chan struct{}, 1),
	}
}

// Run starts the chat event loop in the background, then starts
// the event loop for the text UI.
func (ui *UI) Run() error {
	go ui.handleEvents()
	defer ui.end()

	return ui.app.Run()
}

// end signals the event loop to exit gracefully
func (ui *UI) end() {
	ui.doneCh <- struct{}{}
}

// refreshPeers pulls the list of peers currently in the chat room and
// displays the last 8 chars of their peer id in the Peers panel in the ui.
func (ui *UI) refreshPeers() {
	peers := ui.subscriptions[ui.activeSub].ListPeers()

	// clear is not threadsafe so we need to take the lock.
	ui.peersList.Lock()
	ui.peersList.Clear()
	ui.peersList.Unlock()

	for _, p := range peers {
		fmt.Fprintln(ui.peersList, shortID(p))
	}

	ui.app.Draw()
}

// displayChatMessage writes a Message from the room to the message window,
// with the sender's nick highlighted in green.
func (ui *UI) displayChatMessage(cm *Message) {
	prompt := withColor("green", fmt.Sprintf("<%s>:", cm.SenderNick))
	fmt.Fprintf(ui.msgW, "%s %s\n", prompt, cm.Message)
}

// displaySelfMessage writes a message from ourself to the message window,
// with our nick highlighted in yellow.
func (ui *UI) displaySelfMessage(msg string) {
	prompt := withColor("yellow", fmt.Sprintf("<%s>:", ui.subscriptions[ui.activeSub].nick))
	fmt.Fprintf(ui.msgW, "%s %s\n", prompt, msg)
}

// handleEvents runs an event loop that sends user input to the chat room
// and displays messages received from the chat room. It also periodically
// refreshes the list of peers in the UI.
func (ui *UI) handleEvents() {
	peerRefreshTicker := time.NewTicker(time.Second)
	defer peerRefreshTicker.Stop()

	for {
		select {
		case input := <-ui.inputCh:
			// when the user types in a line, publish it to the chat room and print to the message window
			ui.handleInput(input)

		case m := <-ui.subscriptions[ui.activeSub].Messages:
			// when we receive a message from the chat room, print it to the message window
			ui.displayChatMessage(m)

		case <-peerRefreshTicker.C:
			// refresh the list of peers in the chat room periodically
			ui.refreshPeers()

		case <-ui.subscriptions[ui.activeSub].ctx.Done():
			return

		case <-ui.doneCh:
			return
		}
	}
}

// withColor wraps a string with color tags for display in the messages text box.
func withColor(color, msg string) string {
	return fmt.Sprintf("[%s]%s[-]", color, msg)
}


func (ui *UI) handleInput(input string) {
	if input[0:1] == "/" {
		if input[1:4] == "sub" {
			ui.subscribe(strings.Trim(input[4:], " "))
		} else if input[1:4] == "get" {
			ui.get(strings.Trim(input[4:], " "))
		}
	} else {
		err := ui.subscriptions[ui.nick].Publish(input)
		if err != nil {
			printErr("publish error: %s", err)
		}
		ui.displaySelfMessage(input)
	}
}

func (ui *UI) subscribe(user string) {
	// create a new PubSub service using the GossipSub router
	ps, err := pubsub.NewGossipSub(ui.cx, ui.h)
	if err != nil {
		panic(err)
	}

	// join the chat room
	subscription, err := SubscribeUser(ui.cx, ps, ui.h.ID(), ui.nick, user)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Subscribed to %s\n", user)
	ui.subscriptions[user] = subscription
}

func (ui *UI) get(user string) {
	ui.activeSub = user
	fmt.Fprintf(ui.msgW, strings.Repeat("\n", 20))
	fmt.Printf("\nGetting %s's timeline\n", user)
	for m := range ui.subscriptions[ui.activeSub].Messages {
		ui.displayChatMessage(m)
	}
}
