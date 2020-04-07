
/* 
 * Цены в приложении 
 * Product    - медитации;
 * ProductSet - сет;
 * vipAccess  - доступ на весь контент;
 * H - hours; M - months;
 */  
let Config = {
  name:       'Config',
  primaryKey: 'hashId',
  properties:{
    hashId:            {type: 'string',    optional: false,    indexed: true},  
    name:              {type: 'string',    optional: false,    default: 'Config'},
  
    // цены
    product48H:        {type: 'int',       optional: false,    default:99},
    product1M:         {type: 'int',       optional: false,    default:299},
    product12M:        {type: 'int',       optional: false,    default:1299},
    productSet1M:      {type: 'int',       optional: false,    default:899},
    productSet12M:     {type: 'int',       optional: false,    default:1899},
    vipAccess3M:       {type: 'int',       optional: false,    default:5000},
    vipAccess6M:       {type: 'int',       optional: false,    default:8000},
    vipAccess12M:      {type: 'int',       optional: false,    default:12000},

    // testStringArray:	  {type: 'string[]',	optional: false},

    // длительность временных промежутков в секундах
    secondsIn48H:      {type: 'int',       optional: false,    default: 172800},
    secondsIn1M:       {type: 'int',       optional: false,    default: 2592000},
    secondsIn3M:       {type: 'int',       optional: false,    default: 7776000},
    secondsIn6M:       {type: 'int',       optional: false,    default: 15552000},
    secondsIn12M:      {type: 'int',       optional: false,    default: 31536000},

    isExist:           {type: 'bool',      optional: false,    default: true},
    updated:           {type: 'int',       optional: false},
    created:           {type: 'int',       optional: false},
  }
}

// стандартная схема
let Document = {
  name: 'Document',
  primaryKey: 'hashId',
  properties: {
    hashId:         {type:  'string',   optional: false},
    name:           {type:  'string',   optional: false},
    image:		      {type:  'Image',	  optional: false},
    // title:       {type:  'string',   optional: false},
    txttext:        {type:  'string',   optional: false},
    __type:         {type:  'string',   optional: false},

    isExist:        {type:  'bool',     optional: false},
    updated:        {type:  'int',      optional: false},
    created:        {type:  'int',      optional: false},
  }
}

// схема пользователя
let User = {
  name: 'User',
  primaryKey: 'hashId',
  properties: {
    hashId:         {type:  'string',       optional: false,     indexed: true},
    deviceId:       {type:  'string',       optional: false},
    name:           {type:  'string',       optional: false,     default: ''},
    phone:          {type:  'string',       optional: false,     default: ''},
    email:          {type:  'string',       optional: false,     default: ''},
    fcmToken:       {type:  'string',       optional: false,     default: ''},
    role:           {type:  'string',       optional: false,     default: 'user'},
    isInvited:      {type:  'bool',         optional: false,     default: false},
    isInviteTaken:  {type:  'bool',         optional: false,     default: false},
    //вип доступен до (timestamp)
    vipAccessTo:    {type:  'int',          optional: false,     default: 0},
    isExist:        {type:  'bool',         optional: false},
    updated:        {type:  'int',          optional: false},
    created:        {type:  'int',          optional: false},
  },
}
/* схема покупки пользователя*/
let Order = {
  name: 'Order',
  primaryKey: 'hashId',
  properties: {
    hashId:         {type: 'string',        optional: false,      indexed: true},
    userHashId:     {type: 'string',        optional: false,      indexed: true},
    // productHashId:  {type: 'string',        optional: false,      indexed: true},
    // productName:    {type: 'string',        optional: false,      default: ''},
    
    // типы: product48H / product1M / product12M / productSet1M / productSet12M / vipAccess3M / vipAccess6M / vipAccess12M
    __type:		      {type: 'string',	      optional: false}, 
    avaliableTime:  {type: 'int',           optional: false,      default: 0},
    price:          {type: 'int',           optional: false,      default: 0},
    productSet:     {type: 'ProductSet',    optional: false}, //если покупаем сет, то ссылка, иначе null
    product:        {type: 'Product',       optional: false}, //если покупаем одиночную медитацию, то ссылка, иначе null
    orderNum:       {type: 'string',        optional: false},
    status:         {type: 'string',        optional: false,      default: 'created'},
    isExist:        {type: 'bool',          optional: false,      default: true},
    updated:        {type: 'int',           optional: false},
    created:        {type: 'int',           optional: false},
  }
}

/* схема сета медитаций */ 
let ProductSet = {
  name: 'ProductSet',
  primaryKey: 'hashId',
  properties: {
    hashId:         {type: 'string',        optional: false,     indexed: true},

    name:           {type: 'string',        optional: false,     default: ''},
    txtInfo:        {type: 'string',        optional: false,     default: ''},
    image:          {type: 'Image',         optional: false},
    rune:		        {type: 'Rune[]',	      optional: false},  
    tracks:		      {type: 'Product[]',	    optional: false},
    intro:		      {type: 'Product', 	    optional: false},
   
    isFree:         {type: 'bool',          optional: false,     default: false},
    isExist:        {type: 'bool',          optional: false,     default: true}, 
    updated:        {type: 'int',           optional: false},
    created:        {type: 'int',           optional: false},
  }
}

/*медитация*/
let Product = {
  name: 'Product',
  primaryKey: 'hashId',
  properties:{
    hashId:         {type: 'string',        optional: false,     indexed: true},
    name:           {type: 'string',        optional: false,     default: ''},
    txtInfo:        {type: 'string',        optional: false,     default: ''},
    image:          {type: 'Image',         optional: false},
    audio:          {type: 'Audio',         optional: false},
    purpose:        {type: 'Purpose[]',     optional: false},
    isIntro:		    {type: 'bool',	        optional: false,     default: false},
    __duration:		  {type: 'string',	      optional: false,     default: '' },
    chackras:		    {type: 'Chackra[]',	    optional: false},
    
    isSingle:		    {type: 'bool',	        optional: false,    default: true},
    isPopular:      {type: 'bool',          optional: false,    default: false},
    isQuickStart:   {type: 'bool',          optional: false,    default: false},
    isHunter:		    {type: 'bool',	        optional: false,    default: false},
    isFree:         {type: 'bool',          optional: false,    default: false},

    isExist:        {type: 'bool',          optional: false,     default: true},
    updated:        {type: 'int',           optional: false},
    created:        {type: 'int',           optional: false},
  }
}
/* схема цели медитации; ключ для разных Product (медитаций) */
let Purpose = {
  name:       'Purpose',
  primaryKey: 'hashId',
  properties: {
    hashId:         {type: 'string',        optional: false,     indexed: true},
    name:			      {type: 'string',	      optional: false,     default: ''},
    serialNum:		  {type: 'int',	          optional: false,     default: 0},
    // __type:		      {type: 'string',	      optional: false}, 

    isExist:        {type: 'bool',          optional: false,     default: true},
    updated:        {type: 'int',           optional: false},
    created:        {type: 'int',           optional: false},
  }
}
/* схема руны; ключ для разных ProductSet (сетов) */ 
let Rune = {
  name: 'Rune',
  primaryKey: 'hashId',
  properties: {
    hashId:        {type: 'string',         optional: false,     indexed: true},
    // userHashId: {type: 'string',         optional: false,     indexed: true},
    name:			     {type: 'string',	        optional: false,     default: ''},
    // txtInfo:       {type: 'string',         optional: false,     default: ''},
    serialNum:     {type: 'int',            optional: false,     default: 0}, 
    // image:         {type: 'Image',          optional: false},
    
    isExist:       {type: 'bool',           optional: false,     default: true},
    updated:       {type: 'int',            optional: false},
    created:       {type: 'int',            optional: false},
  }
}
/* схема чакры пользователя */
let Chackra = {
  name: 'Chackra',
  primaryKey: 'hashId',
  properties: {
    hashId:         {type: 'string',        optional: false,     indexed: true},
    name:			      {type: 'string',	      optional: false,     default: ''},
    serialNum:		  {type: 'int',	          optional: false,     default: 0},
    activeTo:		    {type: 'int',	          optional: false,     default: 0},
    color:          {type: 'string',        optional: false,     default: ''},
    // txtInfo:       {type: 'string',         optional: false,     default: ''},
  
    isExist:       {type: 'bool',           optional: false,     default: true},
      
    updated:       {type: 'int',            optional: false},
    created:       {type: 'int',            optional: false},
  }
}
/* схема анонса - ссылка на видео или ссылка с изображением */
let Announce = {
  name: 'Announce',
  primaryKey: 'hashId',
  properties: {
    hashId:        {type: 'string',         optional: false,     indexed: true},
    name:			     {type: 'string',	        optional: false,     default: ''},
    txtInfo:       {type: 'string',         optional: false,     default: ''},
    image:         {type: 'Image',          optional: false},   
    link:          {type: 'string',         optional: false,     default: ''},
    __type:        {type: 'string',	        optional: false},
  
    isExist:       {type: 'bool',           optional: false,     default: true},
      
    updated:       {type: 'int',            optional: false},
    created:       {type: 'int',            optional: false},
  }
}
/* схема картинки */ 
let Image = {
  name: 'Image',
  primaryKey: 'hashId',
  properties: {
    hashId:        {type: 'string',         optional: false,     indexed: true},
    original:      {type: 'string',         optional: false},
    preview:       {type: 'string',         optional: false},

    isExist:       {type: 'bool',           optional: false,     default: true},
      
    updated:       {type: 'int',            optional: false},
    created:       {type: 'int',            optional: false},
  }
}
/* схема аудиодорожки */ 
let Audio = {
  name: 'Audio',
  primaryKey: 'hashId',
  properties: {
    hashId:        {type: 'string',         optional: false,     indexed: true},
    file:          {type: 'string',         optional: false},
    sourceName:    {type: 'string',         optional: false,     default: ''},
    isExist:       {type: 'bool',           optional: false,     default: true},
      
    updated:       {type: 'int',            optional: false},
    created:       {type: 'int',            optional: false},
  }
}

// Не трогать
let smsValidation = {
  name: 'smsValidation',
  primaryKey: 'hashId',
  properties: {
      hashId:         {type:  'string',   optional: false},

      code:           {type:  'string',   optional: false},
      phone:          {type:  'string',   optional: false},

      updated:		    {type: 'int',	      optional: false,  default: 0},
      created:		    {type: 'int',	      optional: false,  default: 0},

      isExist:        {type:  'bool',     optional: false},
  }
}

let InviteCode = {
  name: 'InviteCode',
  primaryKey: 'hashId',
  properties: {
      hashId:         {type:  'string',   optional: false, indexed: true},
      userHashId:     {type:  'string',   optional: false, indexed: true},
      code:           {type:  'string',   optional: false},
      isActivated:    {type:  'bool',     optional: false, default: false},

      updated:		    {type: 'int',	      optional: false,  default: 0},
      created:		    {type: 'int',	      optional: false,  default: 0},

      isExist:        {type:  'bool',     optional: false},
  }
}

let RealmSchemes = [
                    Config,
                    Document,
                    User,
                    Order,
                    ProductSet,
                    Product,
                    Purpose,
                    Rune,
                    Chackra,
                    Announce,
                    Image,
                    Audio,
                    smsValidation,
                    InviteCode,
                  ];
module.exports = RealmSchemes;