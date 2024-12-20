import {TransportEvent} from '../src/types/events'

const ev = new TransportEvent([3,12],3)
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
emmiter.addEventListener('transport', eventCallback)

test("Custom Event properties and types", () => {
  expect(ev.type).toBe('transport')
  expect(ev).toHaveProperty('progress')
  expect(ev.progress).toStrictEqual([3,12])
});

test("Custom event emmition", ()=>{
  emmiter.doTest()
  expect(eventCallback).toHaveBeenCalled()
  expect(returnedEvent).toHaveProperty('progress')
})