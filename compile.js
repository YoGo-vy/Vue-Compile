/* 
    Vue编译器原理：
        编译分为三个阶段
            1.使用正则解析template中的Vue执行中的指令和插值中的变量等，形成语法树
            2.标记静态节点，性能优化，diff时直接略过
            3.将parse生成的语法树AST转化为渲染函数
                
 */
class compile{
    constructor(el,vm){
        // 宿主节点
        this.$el = document.querySelector(el);
        // Vue实例对象
        this.$vm = vm;

        // 编译实现
        if(this.$el){
            
            //  1.移动宿主内的所有节点移动到文档碎片片段中 
            this.$fragment = this.node2Fragment(this.$el);
            
            // 2.编译碎片内的Vue指令和插值表达式为显示内容
            this.compile(this.$fragment);

            // 3.将编译后的文档碎片片段，一次全追加到宿主节点内部
            this.$el.appendChild(this.$fragment)
        }
        
    }
     
    node2Fragment(el){
        const frag = document.createDocumentFragment();
        let child;
        while(child = el.firstChild){
            frag.appendChild(child)
        }
        return frag
    }

    
    // 执行编译：对文档片段进行遍历，使用正则匹配
    compile(fragment){

        const childNodes = fragment.childNodes;
        Array.from(childNodes).forEach((node)=>{
           
            //元素类型：v-text; @click
            if(this.isElement(node)){
               
                // 遍历该节点的所有属性，使用正则匹配，调用相应的编译函数,实现编译相应的Vue指令
                const nodeAttrs = node.attributes;
                Array.from(nodeAttrs).forEach((attr)=>{
                    const attrName = attr.name;
                    const exp = attr.value;
                   
                    // Vue指令：v-text；v-modle
                    if(this.isDirective(attrName)){
                        const dir = attrName.substring(2);
                        this[dir] && this[dir](node,this.$vm,exp);
                    }
                    
                    // 事件指令
                    if(this.isEvent(attrName)){
                        // @click 
                        const dir = attrName.substring(1)
                        this.eventHandler(node,this.$vm,exp,dir)
                    }
                })

            // 节点为文本类型(插值表达式)：{{name}}
            }else if(this.isText(node)){
                this.compileText(node);
            }

            // 递归子节点:判断当前节点是否包含子节点
            if(node.childNodes && node.childNodes.length>0){
                this.compile(node)
            }
            
        })

    }


    // 编译插值表达式
    compileText(node){

        // 匹配正则RegExp.$1，解析编译Vue插值表达式内容
        this.updata(node,this.$vm,RegExp.$1,'text')
    }

    
    // 动态更新函数:
    updata(node,vm,exp,dir){
        const updatarFn = this[dir+'Updata']

        // 1.初始化该node节点的插值内容
        updatarFn && updatarFn(node,vm[exp])
        
        // 2.依赖收集：后续改动更新数据
        // 触发Kvue的getter,向KVue的属性依赖对象添加watcher依赖
        new Watcher(vm,exp,function(value){
            updatarFn && updatarFn(node,value)
        })
    }

    // 文本节点更新
    textUpdata(node,value){
        node.textContent = value
    }

    // 编译v-text指令
    text(node,vm,exp){
        this.updata(node,vm,exp,'text')
    }

    // 编译v-modle双向绑定指令
    model(node,vm,exp){
        // 1.绑定input的value值
        this.updata(node,vm,exp,'modle')
        // 2.视图驱动模型
        node.addEventListener('input',e=>{
            // 触发$data的setter函数，最终调用modleUpdata()更新编译
            vm[exp] = e.target.value;
        })
    }

    modleUpdata(node,value){
        // 给input的value赋值
        node.value = value
    }

    // 编译v-html
    html(node,vm,exp){
        this.updata(node,vm,exp,'html');
    }
    htmlUpdata(node,value){
        node.innerHTML = value;
    }

  

    



    // 事件指令处理，元素事件绑定
    eventHandler(node,vm,exp,dir){
        // 回调函数--事件处理函数(判断Vue实例中定义的methods，查找对用的执行函数)
        let fn = vm.$options.methods && vm.$options.methods[exp];
        // 指令和执行函数为true
        if(dir && fn){
            // 绑定事件函数，通过bind将执行函数内部指令指向Vue实例
            node.addEventListener(dir,fn.bind(vm));
        }
    }

    

    

    
/* 
    判断文本节点和文本节点
    元素节点，nodeType 属性将返回 1。
    属性节点，nodeType 属性将返回 2。
    元素或属性中的文本内容节点，nodeType 属性将返回 3。
*/   
    // 判断当前node节点为element节点  
    isElement(node){
        return node.nodeType === 1
    }
     
    // 判断当前node节点为文本节点,且含有插值表达式的文本节点
    isText(node){
        // textContent; innerText; innerHTML    
        // 判断当前node节点为文本节点,且含有插值表达式的文本节点
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }

    // 判断当前element节点的当前属性为Vue文本指令（v-）
    isDirective(attr){
        return attr.indexOf('v-') == 0
    }
     // 判断当前element节点的当前属性为Vue事件绑定指令（v-bind，@）
    isEvent(attr){
        return attr.indexOf('@') == 0;
    }
}