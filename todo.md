2026-01-18

The goal is to completely change the current game design
we want to make it super easy to play
make it an number + idle game instead of a half block/territory control game
We want to make everything to number based
Including building, army, combat
We probably still need several pages:
Buildings, Resources, Battle, Research
There will be no building unit idea ... feeling
all the buildings of the same type will be grouped together like resource
they make productions actions every 0.5s
there's no region concept, no expansion and map concept
The building slots will also be a type of resource
User need to build expander building to expand the buliding slots
However, the more expander player built, the more threat level it will be
We need some discussion on the battle mechanism
Let's probably build a base building
Every x seconds/minutes (depending on the threat level)
there will be enemy threats
enemy threat will have two consequences
attack + life
player need to have enough defend bulidings/units, or repair speed, or large base health
to endure the attack
and player need to have enough attack power to defeat the enemies
Therefore, all resources, power, minerals, buildings are all shared in the same space.
In this case we cannot control the individual level of the buildings
hence, we need to have a new concpet as -- unique-function buildings
which means, once these buildings are built, they must be operating
and they only have one function
Hence, In the building tab, a assembler/furnace, that's previously used to choose receipes,
now it will show multiple different buildings, called assembler-circuit
furnace-iron-plate. etc.
In this case, each resource will have their own storage.
Probably this could better be done in the resource tab.
Each resource can attach with one button -- increase storage (that will cause slots)
BTW I don't like the name slots -- needs to be something like space/lands...etc.
In this case, I want to idle game feeling, where user just click and build more
buildings, and resource are increasing heavily.
A more fundamental change that can make game logic easy is
to make the energy also a resource unit. the power plants could provide some basic energy storage, but not much.

科研tab也要跟建筑tab一样
有一个infobox，当点击一个科研box的时候，infobox里显示科研的介绍，需要的资源，前置，后置科技，还有研究button
下面的科研也都变成一个一个box，可以显示科研级别（红包1级， 绿包2级。。以次类推）。一个科研可能需要多种科研包，按照等级最大的科研包决定科研的等级。
不要研究进度了，点击直接解锁。
科研中心也不负责产生科研进度，直接作为科研包的生产工厂。

把readme也要改一下

空间
初始100
每次扩张器+50
矿机占地5
工厂4
科研厂5
锻炉3
火电站5
太阳能2
机枪塔2

后面每个建筑都要类别对应的空间占值

战斗部分
我方单位应该包括基地，机枪塔（如果有的话）和无人机
基地有基础攻击力20/秒
机枪塔如果被打爆了的话，会处于损伤状态，需要非战斗状态下花资源修复，除非玩家手工移除
所以当防御类建筑在战斗页面被点机时候，会有个button修复（如果有损伤的话）
如果在战斗过程中，战斗页面上方要显示一个局势条，显示我方总剩余生命值：对方总剩余生命值，蓝色vs红色之类的
另外无人机也应该属于一种资源，给10的初始空间，可以增加总数量通过仓库
每个类别的单位，血条应该显示当前总数量*单位血量/初始总数量*单位血量，这样能够显示清楚本来应该有多少
无人机被打爆了之后不能攻击，但是不会消失，也可以通过花资源修复。
修复需要花费修复包。修复包需要研究科技，单独建厂建造，类似factorio
