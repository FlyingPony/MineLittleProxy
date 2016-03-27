//

module.exports = Naming;

function Naming(Prefix){
    this.Prefix = Prefix;
    this.NumericPrefix = 0;
}

Naming.prototype.makeName = function(){
    this.NumericPrefix++;
    return this.Prefix + "_" + this.NumericPrefix;
}