import PipeLine from './libs/pipeline';

import Combiner from './libs/combiner';
import WxmlNode from './nodes/base';

class Factory {
  private pipeline: PipeLine;
  private combiner: Combiner;
  public option: any;

  constructor(option) {
    this.option = option;
    this.pipeline = new PipeLine(option);
    this.combiner = new Combiner(option);
    this.pipeline.connect(this.combiner);
  }

  run(input: string) {
    this.pipeline.run(input);
    return this.combiner.root;
  }
}

let factory: Factory;

/**
 * 解析wxml
 *
 * @export
 * @param {*} wxml
 * @param {*} option
 * @returns {WxmlNode[]}
 */
export function parse(wxml, option): WxmlNode[] {
  factory = factory || new Factory(option);
  const result = factory.run(wxml);
  return result;
}
