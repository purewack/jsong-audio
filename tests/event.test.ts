import {TransportEvent} from '../src/types/events'

const ev = new TransportEvent("timing", '4:2',0,0,0)
class Emmiter extends EventTarget {
  doTest(){
    this.dispatchEvent(ev)
  }
}
let returnedEvent: any
const eventCallback = jest.fn( (e: any) => {
  returnedEvent = e
})

const emmiter = new Emmiter()
emmiter.addEventListener('timing', eventCallback)

test("Custom Event properties and types", () => {
  expect(ev.type).toBe('timing')
  expect(ev).toHaveProperty('when')
  expect(ev.when).toBe('4:2')
});

test("Custom event emmition", ()=>{
  emmiter.doTest()
  expect(eventCallback).toHaveBeenCalled()
  expect(returnedEvent).toHaveProperty('when')
})