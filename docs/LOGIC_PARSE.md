# Parsing from different states

Circle shapes are player states.

Solid lines indicate automatic progression, dashed/dotted lines are user actions.

The user can request to load a song at any time from any state of the player.

```mermaid
graph 
	
subgraph parsing
	created[[created]]
	created-->empty
	new(load new)
	empty((empty))
	parse((parsing))
	empty-.->new
	new-->parse-->checkNew{is loadable}
	checkNew--"yes"-->stopForParse[force stop]-->parseStop((stopped))
	checkNew--"no"-->checkLoaded
	checkLoaded{had song?}--"yes"-->currentState-.->new
	checkLoaded--"no"-->empty
end


subgraph ready
	play((playing))
	stop((stopped))
	prestop((stopping))
	q((queue))
	next[next]
	cancel[cancel]
	
	play-.->q-->next
	q-.->cancel
	cancel-->play
	next-->play
	play-.->prestop
	prestop-->stop
	stop-.->play
end


```