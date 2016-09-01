import {MethodStubCollection} from './MethodStubCollection';
import {MethodToStub} from './MethodToStub';
import {MethodStub} from './MethodStub';
import {Matcher} from './matcher/Matcher';
import {strictEqual} from './matcher/StrictEqualMatcher';
import {MethodAction} from './MethodAction';

export class Mock {
    private methodStubCollections: any = {};
    private methodActions: Array<MethodAction> = [];
    private mock: any = {};
    private instance: any = {};

    constructor(private clazz: any) {
        this.mock.__tsmockitoInstance = this.instance;
        this.createMethodStubs();
        this.createInstanceActionListeners();
    }

    public getMock():any {
        return this.mock;
    }

    public getAllMatchingActions(matchers:Array<Matcher>): Array<MethodAction> {
        let result: Array<MethodAction> = [];

        for (let item of this.methodActions) {
            if (item.isApplicable(matchers)) {
                result.push(item);
            }
        }
        return result;
    }

    private createMethodStubs(): void {
        for (let key in this.clazz.prototype) {
            this.mock[key] = (...args) => {
                if (!this.methodStubCollections[key]) {
                    this.methodStubCollections[key] = new MethodStubCollection();
                }

                let matchers:Array<Matcher> = [];

                for(let arg of args) {
                    if (!(arg instanceof Matcher)) {
                        matchers.push(strictEqual(arg));
                    } else {
                        matchers.push(arg);
                    }
                }

                return new MethodToStub(this.methodStubCollections[key], matchers, this, key);
            };
        }
    }

    private createInstanceActionListeners(): void {
        for (let key in this.clazz.prototype) {
            this.instance[key] = (...args) => {
                let action: MethodAction = new MethodAction(key, args);
                this.methodActions.push(action);
                return this.getMethodStub(key, args);
            };
        }
    }

    private getMethodStub(key, args):MethodStub {
        let methodStub: MethodStubCollection = this.methodStubCollections[key];
        if(!methodStub) {
            return new MethodStub([], null).getValue();
        } else if (methodStub.getHadMoreThanOneBehavior() && methodStub.hasMatching(args)) {
            return methodStub.getFirstMatchingAndRemove(args).getValue();
        } else if (methodStub.hasMatching(args)) {
            return methodStub.getFirstMatching(args).getValue();
        } else {
            return new MethodStub([], null).getValue();
        }
    }
}