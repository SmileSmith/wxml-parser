import { NODE_TYPES } from './type';

export default class WxmlNode {
  public type: NODE_TYPES;

  constructor(type: NODE_TYPES) {
    this.type = type;
  }

  toTree() {
    throw new Error('no type in this node');
  }
}
