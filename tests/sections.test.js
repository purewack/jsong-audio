const {JSONgPlayer} = require('../JSONgPlayer')

describe('section flow',()=>{
    
test('quantize time to nearest bar',()=>{
    expect(QuanTime('0:0:2',[4,4])).toBe('1:0:0')


})
})