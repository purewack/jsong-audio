import Logger from '../src/logger';

  // test('should log an error', () => {
  //   const logger = new Logger();
  //   const spy = jest.spyOn(console, 'error');
  //   const error = new Error('Something went wrong');
  //   logger.error(error);
  //   expect(spy).toHaveBeenCalledWith(error);
  //   spy.mockClear();
  // });

 test('should log a warning message ', () => {
   const logger = new Logger();
   logger.level = 'warning';
   const spy = jest.spyOn(console, 'warn');
   logger.warning('This is a warning message');
   expect(spy).toHaveBeenCalledWith('This is a warning message');
   spy.mockClear();
 });

 test('should not log a warning message if the level is not set', () => {
   const logger = new Logger();
   const spy = jest.spyOn(console, 'warn');
   logger.warning('This is a warning message 2');
   expect(spy).not.toHaveBeenCalled();
   spy.mockClear();
 });

 test('should log an info message', () => {
   const logger = new Logger();
   logger.level = 'info';
   const spy = jest.spyOn(console, 'info');
   logger.info('This is an info message');
   expect(spy).toHaveBeenCalledWith('This is an info message');
   spy.mockClear();
 });

 test('should not log an info message if the level is not set', () => {
   const logger = new Logger();
   const spy = jest.spyOn(console, 'info');
   logger.info('This is an info message');
   expect(spy).not.toHaveBeenCalled();
   spy.mockClear();
 });
