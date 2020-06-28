
/* 
    简单实现Vue框架的数据响应式：
        Vue中的data数据初始化，使用definedProperty数据劫持定义数据的每个属性
        来监听每一项属性的变化，当某个属性发生变化时通知需要更新的属性作更行

*/
class KVue {
    //vue构造函数，接受new实例时传递的参数对象
    constructor(options){
        this.$options = options
        this.$data = options.data;
        // 数据响应式
        this.observe(this.$data);

        // 应用编译，传递当前的元素和Vue实例
        new compile(this.$options.el,this)

        // 使用生命周期钩子：让实例的钩子函数内部的this指向当前vue实例
        if(options.created){
            options.created.call(this)
        }
    }

    // 数据响应式
    observe(data){
        // 创建Vue实例，传递的data数据须为对象
        if(!data || typeof data !== 'object'){
            return
        }
        // 遍历data数据，对数据数据劫持，defineProperty（）
        Object.keys(data).forEach((key)=>{
            console.log('遍历数据')
           
            // 对$data数据
            this.defineReactive(data,key,data[key])
            
            // 代理$data中的数据到Vue实例上
            this.proxyData(key)

        })
    } 
    // 对数据数据劫持
    defineReactive(data,key,val){
       
        // 使用递归，处理复杂的data对象
        if(val instanceof Object){
            this.observe(val)
            return
        }

        // 为每项属性创建一个Dependency依赖对象
        const dep = new Dep();

        Object.defineProperty(data,key,{

            get(){
                // 访问属性会触发get函数，向依赖Dep对象添加watcher依赖
                Dep.target && dep.addDep(Dep.target)
                return val
            },
            // 修改属性会触发set函数，通知更新Vue的$data数据
            set(newValue){
                if(val === newValue) {return}
                val = newValue
                
                // 通知更新Vue的$data数据
                dep.notify()
            }
        })
    }

    // 代理$data中的数据到Vue实例上:
    proxyData(key){
        // this指向proxyData调用者，Vue实例
        Object.defineProperty(this,key,{
            get:function(){
                // this指向getter调用者，Vue实例
                return this.$data[key]
            },
            set:function(newValue){ 
                // this.$data[key]赋值操作，触发$data的setter，通知更新
                this.$data[key] = newValue
            }
        })
    }
}

// 数据的依赖对象Dependency：用来管理Watcher依赖
class Dep {
    constructor(){
        // 用于存放若干Watcher
        this.deps = [];
        }
    
    // 添加依赖
    addDep(dep) {
        this.deps.push(dep)
    }
    
    // 遍历data数据的当前属性的依赖对象的Dep，通知每项依赖作更行
    notify(){
        this.deps.forEach((dep)=>{
            
            // 调用watcher的updata实现更新操作
            dep.updata()
        })
    }

}

//Watcher： 具体依赖
class Watcher{
    constructor(vm,key,callback){
        this.vm = vm;
        this.key = key;
        this.callback = callback

        //将当前的watcher实例指向Dep的静态属性target
        Dep.target = this;

        // 访问data数据属性，触发getter函数，添加依赖
        this.vm[this.key];

        // 当前依赖添加完成,将Dep的target置空
        Dep.target = null;
    }

    // 更新操作,执行callback回调函数
    updata(){
        this.callback.call(this.vm,this.vm[this.key])
    }
}