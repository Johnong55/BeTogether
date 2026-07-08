// Ngữ pháp tiếng Anh — dữ liệu tĩnh, viết tay & kiểm chuẩn (KHÔNG sinh bằng AI).
// Đợt 1: 12 thì. group: present | past | future (đợt sau: conditional | passive | reported | comparison).
// Mỗi practice: type 'conj' (chia động từ điền chỗ trống) hoặc 'mc' (trắc nghiệm).
window.GRAMMAR = [
/* ===================== HIỆN TẠI ===================== */
{
  id:'present-simple', group:'present', name:'Hiện tại đơn', en:'Present Simple', tag:'HTĐ',
  formula:{ aff:"S + V(nguyên)/V-s(es)", neg:"S + do/does + not + V(nguyên)", ques:"Do/Does + S + V(nguyên)?" },
  usage:[
    "Thói quen, việc lặp đi lặp lại.",
    "Chân lý, sự thật hiển nhiên.",
    "Lịch trình, thời gian biểu cố định (tàu, xe, phim…).",
    "Trạng thái, cảm xúc (like, love, want, know…)."
  ],
  signals:["every day","always","usually","often","sometimes","rarely","never","on Mondays"],
  examples:[
    { en:"She goes to school every day.", vi:"Cô ấy đi học mỗi ngày." },
    { en:"The sun rises in the east.", vi:"Mặt trời mọc ở hướng đông." },
    { en:"I don't drink coffee.", vi:"Tôi không uống cà phê." },
    { en:"Does he play football?", vi:"Anh ấy có chơi bóng đá không?" },
    { en:"Water boils at 100 degrees Celsius.", vi:"Nước sôi ở 100 độ C." }
  ],
  practice:[
    { type:'conj', q:"She ___ (go) to school every day.", answer:"goes", alts:[], explain:"Chủ ngữ ngôi 3 số ít → động từ thêm -es (go → goes)." },
    { type:'conj', q:"They ___ (not / like) coffee.", answer:"do not like", alts:["don't like"], explain:"Phủ định với chủ ngữ số nhiều: do + not + V nguyên." },
    { type:'conj', q:"My father ___ (work) in a bank.", answer:"works", alts:[], explain:"Ngôi 3 số ít → thêm -s (work → works)." },
    { type:'conj', q:"He ___ (not / watch) TV in the morning.", answer:"does not watch", alts:["doesn't watch"], explain:"Ngôi 3 số ít phủ định: does + not + V nguyên (watch, không phải watches)." },
    { type:'mc', q:'Chọn dạng đúng: "Water ___ at 100°C." (Nước sôi ở 100 độ C)', options:["boil","boils","is boiling","boiled"], answer:1, explain:"Chân lý → Hiện tại đơn; chủ ngữ số ít ngôi 3 → boils." },
    { type:'mc', q:"Câu nào ĐÚNG ngữ pháp?", options:["She go to school.","She goes to school.","She going to school.","She is go to school."], answer:1, explain:"Ngôi 3 số ít cần -es: She goes to school." },
    { type:'mc', q:"Dấu hiệu nào KHÔNG đi với thì Hiện tại đơn?", options:["every day","usually","now","on Sundays"], answer:2, explain:'"now" là dấu hiệu của Hiện tại tiếp diễn.' }
  ]
},
{
  id:'present-continuous', group:'present', name:'Hiện tại tiếp diễn', en:'Present Continuous', tag:'HTTD',
  formula:{ aff:"S + am/is/are + V-ing", neg:"S + am/is/are + not + V-ing", ques:"Am/Is/Are + S + V-ing?" },
  usage:[
    "Hành động đang xảy ra ngay lúc nói.",
    "Hành động mang tính tạm thời trong giai đoạn hiện tại.",
    "Kế hoạch chắc chắn trong tương lai gần (có mốc thời gian).",
    "Phàn nàn về thói quen gây khó chịu (với always)."
  ],
  signals:["now","right now","at the moment","at present","Look!","Listen!","currently","today"],
  examples:[
    { en:"She is reading a book now.", vi:"Cô ấy đang đọc sách bây giờ." },
    { en:"Look! The children are playing.", vi:"Nhìn kìa! Bọn trẻ đang chơi." },
    { en:"I am meeting my friend tomorrow.", vi:"Tôi sẽ gặp bạn vào ngày mai (kế hoạch)." },
    { en:"They are not working today.", vi:"Hôm nay họ không làm việc." }
  ],
  practice:[
    { type:'conj', q:"Listen! Someone ___ (sing).", answer:"is singing", alts:[], explain:"Đang xảy ra lúc nói: is + V-ing (sing → singing)." },
    { type:'conj', q:"We ___ (study) English now.", answer:"are studying", alts:[], explain:"Chủ ngữ số nhiều: are + V-ing (study → studying)." },
    { type:'conj', q:"She ___ (not / sleep) at the moment.", answer:"is not sleeping", alts:["isn't sleeping"], explain:"Phủ định: is + not + V-ing (sleep → sleeping)." },
    { type:'conj', q:"I ___ (cook) dinner right now.", answer:"am cooking", alts:[], explain:"Chủ ngữ I: am + V-ing." },
    { type:'conj', q:"They ___ (watch) a film at the moment.", answer:"are watching", alts:[], explain:"Số nhiều: are + V-ing." },
    { type:'mc', q:'Chọn thì đúng: "Look! It ___." (Nhìn kìa! Trời đang mưa)', options:["rains","is raining","rained","has rained"], answer:1, explain:'"Look!" báo hiệu đang xảy ra → is raining.' },
    { type:'mc', q:"Dấu hiệu nào của thì Hiện tại tiếp diễn?", options:["every day","now","yesterday","last week"], answer:1, explain:'"now" đi với Hiện tại tiếp diễn.' }
  ]
},
{
  id:'present-perfect', group:'present', name:'Hiện tại hoàn thành', en:'Present Perfect', tag:'HTHT',
  formula:{ aff:"S + have/has + V3/V-ed", neg:"S + have/has + not + V3", ques:"Have/Has + S + V3?" },
  usage:[
    "Việc đã xảy ra nhưng không nêu rõ thời điểm, kết quả còn ở hiện tại.",
    "Việc vừa mới xảy ra (just).",
    "Trải nghiệm tính đến hiện tại (ever/never).",
    "Hành động bắt đầu trong quá khứ, kéo dài đến hiện tại (for/since)."
  ],
  signals:["just","already","yet","ever","never","recently","so far","for","since","up to now"],
  examples:[
    { en:"I have finished my homework.", vi:"Tôi đã làm xong bài tập (giờ đã xong)." },
    { en:"She has lived here for five years.", vi:"Cô ấy đã sống ở đây được 5 năm." },
    { en:"Have you ever been to Japan?", vi:"Bạn đã bao giờ đến Nhật chưa?" },
    { en:"He has just left.", vi:"Anh ấy vừa mới rời đi." }
  ],
  practice:[
    { type:'conj', q:"I ___ (finish) my homework already.", answer:"have finished", alts:[], explain:"have + V3 (finish → finished); 'already' đi với HTHT." },
    { type:'conj', q:"She ___ (live) here since 2010.", answer:"has lived", alts:[], explain:"Ngôi 3 số ít: has + V3; 'since' đi với HTHT." },
    { type:'conj', q:"They ___ (not / eat) lunch yet.", answer:"have not eaten", alts:["haven't eaten"], explain:"Phủ định: have + not + V3 (eat → eaten); 'yet' đi với HTHT." },
    { type:'conj', q:"We ___ (know) each other for ten years.", answer:"have known", alts:[], explain:"have + V3 (know → known); 'for' chỉ khoảng thời gian." },
    { type:'conj', q:"I have ___ (see) that movie twice.", answer:"seen", alts:[], explain:"V3 của see là seen (trải nghiệm 'twice')." },
    { type:'mc', q:'Chọn dạng đúng: "He ___ to Paris." (Anh ấy đã từng đến Paris)', options:["went","has been","is going","goes"], answer:1, explain:"Trải nghiệm 'đã từng đến' → have/has been to." },
    { type:'mc', q:"Dấu hiệu nào của thì Hiện tại hoàn thành?", options:["yesterday","already","tomorrow","now"], answer:1, explain:'"already" đi với Hiện tại hoàn thành; "yesterday" là Quá khứ đơn.' }
  ]
},
{
  id:'present-perfect-continuous', group:'present', name:'Hiện tại hoàn thành tiếp diễn', en:'Present Perfect Continuous', tag:'HTHTTD',
  formula:{ aff:"S + have/has + been + V-ing", neg:"S + have/has + not + been + V-ing", ques:"Have/Has + S + been + V-ing?" },
  usage:[
    "Hành động bắt đầu trong quá khứ, kéo dài LIÊN TỤC đến hiện tại (nhấn khoảng thời gian).",
    "Hành động vừa dừng, để lại kết quả nhìn thấy ở hiện tại.",
    "Trả lời câu hỏi 'How long…?' nhấn tính liên tục."
  ],
  signals:["for","since","all day","all morning","how long","lately","recently"],
  examples:[
    { en:"I have been studying for three hours.", vi:"Tôi đã học liên tục được 3 tiếng." },
    { en:"It has been raining all day.", vi:"Trời mưa suốt cả ngày." },
    { en:"She has been working here since May.", vi:"Cô ấy làm ở đây từ tháng Năm." },
    { en:"How long have you been waiting?", vi:"Bạn đã đợi bao lâu rồi?" }
  ],
  practice:[
    { type:'conj', q:"I ___ (study) for three hours.", answer:"have been studying", alts:[], explain:"have + been + V-ing, nhấn khoảng thời gian liên tục." },
    { type:'conj', q:"It ___ (rain) all day.", answer:"has been raining", alts:[], explain:"Ngôi 3 số ít: has + been + V-ing." },
    { type:'conj', q:"They ___ (wait) since 8 a.m.", answer:"have been waiting", alts:[], explain:"have + been + V-ing; 'since' chỉ mốc bắt đầu." },
    { type:'conj', q:"We ___ (learn) English since 2015.", answer:"have been learning", alts:[], explain:"have + been + V-ing, hành động liên tục đến nay." },
    { type:'mc', q:'Chọn thì nhấn mạnh tính LIÊN TỤC: "She is tired because she ___ all day."', options:["works","has worked","has been working","worked"], answer:2, explain:"Nhấn hành động kéo dài liên tục cả ngày → Hiện tại hoàn thành tiếp diễn." }
  ]
},
/* ===================== QUÁ KHỨ ===================== */
{
  id:'past-simple', group:'past', name:'Quá khứ đơn', en:'Past Simple', tag:'QKĐ',
  formula:{ aff:"S + V2/V-ed", neg:"S + did + not + V(nguyên)", ques:"Did + S + V(nguyên)?" },
  usage:[
    "Hành động đã hoàn thành trong quá khứ với thời điểm xác định.",
    "Chuỗi hành động liên tiếp trong quá khứ.",
    "Thói quen trong quá khứ (nay không còn)."
  ],
  signals:["yesterday","last night","last week","ago","in 2010","then","when"],
  examples:[
    { en:"I visited my grandmother yesterday.", vi:"Tôi đã thăm bà tôi hôm qua." },
    { en:"She went to Paris last summer.", vi:"Cô ấy đã đến Paris hè năm ngoái." },
    { en:"They didn't come to the party.", vi:"Họ đã không đến bữa tiệc." },
    { en:"Did you see him?", vi:"Bạn có gặp anh ấy không?" }
  ],
  practice:[
    { type:'conj', q:"I ___ (visit) my grandma yesterday.", answer:"visited", alts:[], explain:"Động từ thường → thêm -ed (visit → visited)." },
    { type:'conj', q:"She ___ (go) to school late.", answer:"went", alts:[], explain:"go là động từ bất quy tắc: go → went." },
    { type:'conj', q:"They ___ (not / come) to the party.", answer:"did not come", alts:["didn't come"], explain:"Phủ định: did + not + V nguyên (come, không phải came)." },
    { type:'conj', q:"We ___ (buy) a new car last month.", answer:"bought", alts:[], explain:"buy → bought (bất quy tắc)." },
    { type:'conj', q:"Did she ___ (finish) the test?", answer:"finish", alts:[], explain:"Sau 'did' dùng V nguyên (finish, không phải finished)." },
    { type:'mc', q:'Chọn dạng đúng: "He ___ his keys yesterday." (Anh ấy làm mất chìa khoá hôm qua)', options:["lose","lost","has lost","loses"], answer:1, explain:"'yesterday' → Quá khứ đơn; lose → lost." },
    { type:'mc', q:"Dấu hiệu nào của thì Quá khứ đơn?", options:["ago","now","already","tomorrow"], answer:0, explain:'"ago" (cách đây) đi với Quá khứ đơn.' }
  ]
},
{
  id:'past-continuous', group:'past', name:'Quá khứ tiếp diễn', en:'Past Continuous', tag:'QKTD',
  formula:{ aff:"S + was/were + V-ing", neg:"S + was/were + not + V-ing", ques:"Was/Were + S + V-ing?" },
  usage:[
    "Hành động đang xảy ra tại một thời điểm xác định trong quá khứ.",
    "Hành động đang xảy ra thì bị hành động khác (Quá khứ đơn) cắt ngang.",
    "Hai hành động xảy ra song song trong quá khứ."
  ],
  signals:["at 8 p.m. yesterday","while","when","at that time","all day yesterday"],
  examples:[
    { en:"I was watching TV at 9 p.m. last night.", vi:"Tôi đang xem TV lúc 9 giờ tối qua." },
    { en:"She was cooking when he arrived.", vi:"Cô ấy đang nấu ăn khi anh ấy đến." },
    { en:"They were not sleeping at midnight.", vi:"Họ đã không ngủ vào lúc nửa đêm." }
  ],
  practice:[
    { type:'conj', q:"I ___ (watch) TV at 9 p.m. yesterday.", answer:"was watching", alts:[], explain:"I → was + V-ing tại thời điểm xác định trong quá khứ." },
    { type:'conj', q:"While she ___ (cook), the phone rang.", answer:"was cooking", alts:[], explain:"Hành động đang diễn ra (was + V-ing) thì bị cắt ngang." },
    { type:'conj', q:"They ___ (play) football when it started to rain.", answer:"were playing", alts:[], explain:"Số nhiều: were + V-ing." },
    { type:'conj', q:"We ___ (not / listen) to the teacher then.", answer:"were not listening", alts:["weren't listening"], explain:"Phủ định số nhiều: were + not + V-ing." },
    { type:'mc', q:'Chọn thì đúng: "I ___ TV when she called." (Tôi đang xem TV khi cô ấy gọi)', options:["watched","was watching","have watched","watch"], answer:1, explain:"Hành động đang diễn ra bị cắt ngang → Quá khứ tiếp diễn." }
  ]
},
{
  id:'past-perfect', group:'past', name:'Quá khứ hoàn thành', en:'Past Perfect', tag:'QKHT',
  formula:{ aff:"S + had + V3", neg:"S + had + not + V3", ques:"Had + S + V3?" },
  usage:[
    "Hành động xảy ra và hoàn thành TRƯỚC một hành động/thời điểm khác trong quá khứ.",
    "Dùng với before/after để làm rõ thứ tự trước – sau.",
    "Trong câu điều kiện loại 3 và câu tường thuật."
  ],
  signals:["before","after","by the time","already","until then","when"],
  examples:[
    { en:"The train had left before I arrived.", vi:"Tàu đã rời đi trước khi tôi đến." },
    { en:"She had finished her work before dinner.", vi:"Cô ấy đã làm xong việc trước bữa tối." },
    { en:"I had never seen snow before I moved here.", vi:"Tôi chưa từng thấy tuyết trước khi chuyển đến đây." }
  ],
  practice:[
    { type:'conj', q:"The train ___ (leave) before I arrived.", answer:"had left", alts:[], explain:"Xảy ra trước 'arrived' → had + V3 (leave → left)." },
    { type:'conj', q:"She ___ (finish) her work before he came.", answer:"had finished", alts:[], explain:"had + V3, hành động xong trước 'came'." },
    { type:'conj', q:"I ___ (not / meet) him before that day.", answer:"had not met", alts:["hadn't met"], explain:"Phủ định: had + not + V3 (meet → met)." },
    { type:'conj', q:"By the time we got there, they ___ (eat) all the food.", answer:"had eaten", alts:[], explain:"Xong trước 'got there' → had + V3 (eat → eaten)." },
    { type:'mc', q:'Chọn thì đúng: "When we arrived, the film ___." (Khi chúng tôi đến, phim đã bắt đầu rồi)', options:["started","has started","had started","was starting"], answer:2, explain:"Phim bắt đầu TRƯỚC khi 'arrived' → Quá khứ hoàn thành." }
  ]
},
{
  id:'past-perfect-continuous', group:'past', name:'Quá khứ hoàn thành tiếp diễn', en:'Past Perfect Continuous', tag:'QKHTTD',
  formula:{ aff:"S + had + been + V-ing", neg:"S + had + not + been + V-ing", ques:"Had + S + been + V-ing?" },
  usage:[
    "Hành động xảy ra liên tục trong một khoảng thời gian TRƯỚC một mốc khác trong quá khứ (nhấn tính liên tục).",
    "Nhấn nguyên nhân/kết quả kéo dài trước một thời điểm quá khứ."
  ],
  signals:["for","since","before","until then","by the time"],
  examples:[
    { en:"He had been working for hours before he took a break.", vi:"Anh ấy đã làm việc liên tục nhiều giờ trước khi nghỉ." },
    { en:"They had been waiting for an hour when the bus came.", vi:"Họ đã đợi được một tiếng khi xe buýt đến." },
    { en:"She was tired because she had been studying all night.", vi:"Cô ấy mệt vì đã học liên tục cả đêm." }
  ],
  practice:[
    { type:'conj', q:"They ___ (wait) for an hour when the bus came.", answer:"had been waiting", alts:[], explain:"had + been + V-ing, nhấn khoảng thời gian đợi trước 'came'." },
    { type:'conj', q:"He was tired because he ___ (work) all day.", answer:"had been working", alts:[], explain:"Nguyên nhân kéo dài trước mốc quá khứ → had been + V-ing." },
    { type:'conj', q:"She ___ (study) for hours before the exam.", answer:"had been studying", alts:[], explain:"had + been + V-ing, liên tục trước 'the exam'." },
    { type:'mc', q:'Chọn thì đúng: "The ground was wet because it ___." (Đất ướt vì trời đã mưa liên tục trước đó)', options:["rained","was raining","had been raining","has rained"], answer:2, explain:"Nguyên nhân kéo dài liên tục trước một mốc quá khứ → Quá khứ hoàn thành tiếp diễn." }
  ]
},
/* ===================== TƯƠNG LAI ===================== */
{
  id:'future-simple', group:'future', name:'Tương lai đơn', en:'Future Simple', tag:'TLĐ',
  formula:{ aff:"S + will + V(nguyên)", neg:"S + will + not (won't) + V", ques:"Will + S + V?" },
  usage:[
    "Quyết định tức thời ngay lúc nói.",
    "Dự đoán không có căn cứ rõ ràng (I think, probably).",
    "Lời hứa, đề nghị, yêu cầu."
  ],
  signals:["tomorrow","next week","next year","soon","in the future","I think","probably"],
  examples:[
    { en:"I will call you tomorrow.", vi:"Tôi sẽ gọi cho bạn ngày mai." },
    { en:"She will probably be late.", vi:"Cô ấy có lẽ sẽ đến muộn." },
    { en:"They won't come.", vi:"Họ sẽ không đến." },
    { en:"Will you help me?", vi:"Bạn sẽ giúp tôi chứ?" }
  ],
  practice:[
    { type:'conj', q:"I ___ (call) you tomorrow.", answer:"will call", alts:["'ll call"], explain:"will + V nguyên cho hành động tương lai." },
    { type:'conj', q:"She ___ (not / come) to the meeting.", answer:"will not come", alts:["won't come"], explain:"Phủ định: will + not + V (viết tắt won't)." },
    { type:'conj', q:"The phone is ringing. I ___ (answer) it.", answer:"will answer", alts:["'ll answer"], explain:"Quyết định tức thời lúc nói → will + V." },
    { type:'conj', q:"He ___ (be) 20 next year.", answer:"will be", alts:["'ll be"], explain:"will + be (động từ to be nguyên mẫu)." },
    { type:'mc', q:'Chọn dạng đúng: "I think it ___ tomorrow." (Tôi nghĩ mai trời sẽ mưa)', options:["rains","is raining","will rain","rained"], answer:2, explain:"Dự đoán 'I think' + 'tomorrow' → will rain." },
    { type:'mc', q:"Dấu hiệu nào của thì Tương lai đơn?", options:["yesterday","tomorrow","now","already"], answer:1, explain:'"tomorrow" đi với thì tương lai.' }
  ]
},
{
  id:'future-continuous', group:'future', name:'Tương lai tiếp diễn', en:'Future Continuous', tag:'TLTD',
  formula:{ aff:"S + will + be + V-ing", neg:"S + will + not + be + V-ing", ques:"Will + S + be + V-ing?" },
  usage:[
    "Hành động đang xảy ra tại một thời điểm xác định trong tương lai.",
    "Hành động song song sẽ diễn ra trong tương lai."
  ],
  signals:["at this time tomorrow","at 8 p.m. tomorrow","this time next week"],
  examples:[
    { en:"I will be flying to London at this time tomorrow.", vi:"Giờ này ngày mai tôi sẽ đang bay tới London." },
    { en:"She will be studying at 8 p.m. tonight.", vi:"8 giờ tối nay cô ấy sẽ đang học." },
    { en:"This time next week, we will be lying on the beach.", vi:"Tuần sau giờ này, chúng tôi sẽ đang nằm trên bãi biển." }
  ],
  practice:[
    { type:'conj', q:"At 8 p.m. tomorrow, I ___ (study).", answer:"will be studying", alts:["'ll be studying"], explain:"will + be + V-ing tại thời điểm xác định trong tương lai." },
    { type:'conj', q:"This time next week, she ___ (travel) in Japan.", answer:"will be travelling", alts:["will be traveling"], explain:"will + be + V-ing (travel → travelling/traveling đều chấp nhận)." },
    { type:'conj', q:"Don't call at 9. I ___ (sleep).", answer:"will be sleeping", alts:["'ll be sleeping"], explain:"Đang diễn ra tại 9 giờ (tương lai) → will be + V-ing." },
    { type:'mc', q:'Chọn thì đúng: "At this time tomorrow, we ___." (Giờ này ngày mai chúng tôi sẽ đang bay)', options:["fly","will fly","will be flying","are flying"], answer:2, explain:"Đang diễn ra tại một thời điểm tương lai → Tương lai tiếp diễn." }
  ]
},
{
  id:'future-perfect', group:'future', name:'Tương lai hoàn thành', en:'Future Perfect', tag:'TLHT',
  formula:{ aff:"S + will + have + V3", neg:"S + will + not + have + V3", ques:"Will + S + have + V3?" },
  usage:[
    "Hành động sẽ hoàn thành TRƯỚC một thời điểm/hành động khác trong tương lai.",
    "Thường đi với 'by' + mốc thời gian tương lai."
  ],
  signals:["by","by the time","by then","before","by tomorrow","by 2030","in two years"],
  examples:[
    { en:"I will have finished the project by Friday.", vi:"Tôi sẽ hoàn thành dự án trước thứ Sáu." },
    { en:"By 2030, they will have built the bridge.", vi:"Đến năm 2030, họ sẽ đã xây xong cây cầu." },
    { en:"She will have left by the time you arrive.", vi:"Cô ấy sẽ đã rời đi trước khi bạn đến." }
  ],
  practice:[
    { type:'conj', q:"I ___ (finish) the report by Friday.", answer:"will have finished", alts:["'ll have finished"], explain:"will + have + V3, xong trước mốc 'by Friday'." },
    { type:'conj', q:"By next year, they ___ (build) the school.", answer:"will have built", alts:[], explain:"will + have + V3 (build → built)." },
    { type:'conj', q:"By 8 p.m., we ___ (eat) dinner.", answer:"will have eaten", alts:[], explain:"will + have + V3 (eat → eaten), xong trước 8 giờ." },
    { type:'mc', q:'Chọn thì đúng: "By the time you arrive, she ___." (Trước khi bạn đến, cô ấy sẽ đã rời đi)', options:["leaves","will leave","will have left","is leaving"], answer:2, explain:"Hoàn thành trước một mốc tương lai → Tương lai hoàn thành." }
  ]
},
{
  id:'future-perfect-continuous', group:'future', name:'Tương lai hoàn thành tiếp diễn', en:'Future Perfect Continuous', tag:'TLHTTD',
  formula:{ aff:"S + will + have + been + V-ing", neg:"S + will + not + have + been + V-ing", ques:"Will + S + have + been + V-ing?" },
  usage:[
    "Nhấn mạnh khoảng thời gian LIÊN TỤC của hành động tính đến một thời điểm trong tương lai.",
    "Thường đi với 'by … for + khoảng thời gian'."
  ],
  signals:["by … for","by then","by the time","for (khoảng thời gian)"],
  examples:[
    { en:"By next month, I will have been working here for five years.", vi:"Đến tháng sau, tôi sẽ đã làm ở đây được 5 năm." },
    { en:"By 6 p.m., she will have been studying for eight hours.", vi:"Đến 6 giờ chiều, cô ấy sẽ đã học liên tục 8 tiếng." },
    { en:"By the time he retires, he will have been teaching for 30 years.", vi:"Đến khi nghỉ hưu, ông ấy sẽ đã dạy được 30 năm." }
  ],
  practice:[
    { type:'conj', q:"By next month, I ___ (work) here for five years.", answer:"will have been working", alts:["'ll have been working"], explain:"will + have + been + V-ing, nhấn khoảng thời gian tính đến 'next month'." },
    { type:'conj', q:"By 6 p.m., she ___ (study) for eight hours.", answer:"will have been studying", alts:[], explain:"will + have + been + V-ing, liên tục đến '6 p.m.'." },
    { type:'mc', q:'Chọn thì nhấn mạnh tính LIÊN TỤC: "By June, she ___ for 8 hours."', options:["will study","will have studied","will have been studying","studies"], answer:2, explain:"Nhấn khoảng thời gian liên tục đến một mốc tương lai → Tương lai hoàn thành tiếp diễn." }
  ]
},
/* ===================== CÂU ĐIỀU KIỆN ===================== */
{
  id:'conditional-0', group:'conditional', name:'Câu điều kiện loại 0', en:'Zero Conditional', tag:'ĐK0',
  forms:[
    { l:'Cấu trúc', t:'If + S + V(hiện tại đơn), S + V(hiện tại đơn)' },
    { l:'Nghĩa', t:'Sự thật luôn đúng (Nếu A thì B). If có thể thay bằng When.' }
  ],
  usage:[
    "Chân lý, sự thật khoa học hiển nhiên.",
    "Thói quen, điều luôn đúng khi có điều kiện.",
    "Hướng dẫn (có thể dùng When thay If)."
  ],
  signals:["if","when","always"],
  examples:[
    { en:"If you heat ice, it melts.", vi:"Nếu bạn đun đá, nó tan chảy." },
    { en:"If it rains, the ground gets wet.", vi:"Nếu trời mưa, mặt đất ướt." },
    { en:"Plants die if they don't get water.", vi:"Cây chết nếu không được tưới nước." },
    { en:"When the sun sets, it gets dark.", vi:"Khi mặt trời lặn, trời tối." }
  ],
  practice:[
    { type:'conj', q:"If you heat ice, it ___ (melt).", answer:"melts", alts:[], explain:"Điều kiện loại 0: cả hai vế dùng Hiện tại đơn; 'it' → thêm -s." },
    { type:'conj', q:"If it ___ (rain), the ground gets wet.", answer:"rains", alts:[], explain:"Vế If cũng dùng Hiện tại đơn; 'it' → rains." },
    { type:'conj', q:"Plants die if they ___ (not / get) water.", answer:"do not get", alts:["don't get"], explain:"Phủ định Hiện tại đơn số nhiều: do not + V nguyên." },
    { type:'mc', q:"Câu điều kiện loại 0 dùng khi nào?", options:["Sự thật hiển nhiên, luôn đúng","Điều không có thật ở hiện tại","Tiếc nuối quá khứ","Dự đoán chắc chắn sẽ xảy ra"], answer:0, explain:"Loại 0 diễn tả chân lý/sự thật luôn đúng." },
    { type:'mc', q:"Chọn câu ĐÚNG (điều kiện loại 0):", options:["If you heat ice, it melted.","If you heat ice, it will melt.","If you heat ice, it melts.","If you heated ice, it melts."], answer:2, explain:"Loại 0: cả hai vế Hiện tại đơn." }
  ]
},
{
  id:'conditional-1', group:'conditional', name:'Câu điều kiện loại 1', en:'First Conditional', tag:'ĐK1',
  forms:[
    { l:'Cấu trúc', t:'If + S + V(hiện tại đơn), S + will + V(nguyên)' },
    { l:'Nghĩa', t:'Điều kiện CÓ THẬT, có thể xảy ra ở hiện tại/tương lai.' }
  ],
  usage:[
    "Điều có khả năng xảy ra trong tương lai nếu điều kiện được thoả.",
    "Lời hứa, lời cảnh báo, đề nghị.",
    "Có thể dùng can/may/should thay cho will ở vế chính."
  ],
  signals:["if","unless","as long as","in case"],
  examples:[
    { en:"If it rains, I will stay at home.", vi:"Nếu trời mưa, tôi sẽ ở nhà." },
    { en:"If you study hard, you will pass the exam.", vi:"Nếu bạn học chăm, bạn sẽ đậu kỳ thi." },
    { en:"She won't come if she is busy.", vi:"Cô ấy sẽ không đến nếu bận." },
    { en:"Unless you hurry, you will miss the bus.", vi:"Trừ khi bạn nhanh lên, bạn sẽ lỡ xe buýt." }
  ],
  practice:[
    { type:'conj', q:"If it rains, I ___ (stay) at home.", answer:"will stay", alts:["'ll stay"], explain:"Vế chính loại 1: will + V nguyên." },
    { type:'conj', q:"If you ___ (study) hard, you will pass.", answer:"study", alts:[], explain:"Vế If dùng Hiện tại đơn (KHÔNG dùng will)." },
    { type:'conj', q:"She ___ (not / come) if she is busy.", answer:"will not come", alts:["won't come"], explain:"Vế chính phủ định: will + not + V." },
    { type:'conj', q:"If you don't hurry, you ___ (miss) the bus.", answer:"will miss", alts:["'ll miss"], explain:"Vế chính: will + V nguyên." },
    { type:'mc', q:"Chọn câu ĐÚNG (điều kiện loại 1):", options:["If it will rain, I will stay home.","If it rains, I will stay home.","If it rained, I will stay home.","If it rains, I stayed home."], answer:1, explain:"Vế If dùng Hiện tại đơn, vế chính dùng will." },
    { type:'mc', q:"Vế 'If' trong điều kiện loại 1 dùng thì gì?", options:["Hiện tại đơn","Tương lai đơn (will)","Quá khứ đơn","Quá khứ hoàn thành"], answer:0, explain:"Vế If loại 1 dùng Hiện tại đơn." }
  ]
},
{
  id:'conditional-2', group:'conditional', name:'Câu điều kiện loại 2', en:'Second Conditional', tag:'ĐK2',
  forms:[
    { l:'Cấu trúc', t:'If + S + V(quá khứ đơn), S + would + V(nguyên)' },
    { l:'Nghĩa', t:'Điều kiện KHÔNG CÓ THẬT / khó xảy ra ở hiện tại (giả định).' }
  ],
  usage:[
    "Giả định trái với thực tế hiện tại.",
    "Đưa lời khuyên (If I were you, ...).",
    "Động từ to be dùng WERE cho MỌI ngôi."
  ],
  signals:["if","would","were"],
  examples:[
    { en:"If I were rich, I would travel the world.", vi:"Nếu tôi giàu, tôi sẽ đi du lịch khắp thế giới (thực tế không giàu)." },
    { en:"If I were you, I would apologize.", vi:"Nếu tôi là bạn, tôi sẽ xin lỗi." },
    { en:"She would help you if she had time.", vi:"Cô ấy sẽ giúp bạn nếu có thời gian (thực tế không có)." },
    { en:"If he studied harder, he would get better grades.", vi:"Nếu anh ấy học chăm hơn, anh ấy sẽ đạt điểm cao hơn." }
  ],
  practice:[
    { type:'conj', q:"If I ___ (be) rich, I would travel a lot.", answer:"were", alts:[], explain:"Điều kiện loại 2: to be luôn dùng 'were' cho mọi ngôi." },
    { type:'conj', q:"If I were you, I ___ (apologize).", answer:"would apologize", alts:["'d apologize"], explain:"Vế chính loại 2: would + V nguyên." },
    { type:'conj', q:"She would help you if she ___ (have) time.", answer:"had", alts:[], explain:"Vế If dùng Quá khứ đơn (have → had)." },
    { type:'conj', q:"If he ___ (study) harder, he would pass.", answer:"studied", alts:[], explain:"Vế If dùng Quá khứ đơn (study → studied)." },
    { type:'mc', q:"Trong điều kiện loại 2, động từ to be dùng dạng nào cho MỌI ngôi?", options:["was","is","were","been"], answer:2, explain:"Dùng 'were': If I were / If he were..." },
    { type:'mc', q:"Chọn câu ĐÚNG (điều kiện loại 2):", options:["If I was you, I would help.","If I were you, I would help.","If I am you, I would help.","If I were you, I will help."], answer:1, explain:"Loại 2: If + were, vế chính + would." }
  ]
},
{
  id:'conditional-3', group:'conditional', name:'Câu điều kiện loại 3', en:'Third Conditional', tag:'ĐK3',
  forms:[
    { l:'Cấu trúc', t:'If + S + had + V3, S + would have + V3' },
    { l:'Nghĩa', t:'Điều kiện KHÔNG CÓ THẬT trong quá khứ (tiếc nuối).' }
  ],
  usage:[
    "Giả định trái với điều đã xảy ra trong quá khứ.",
    "Nuối tiếc hoặc trách móc về điều đã qua."
  ],
  signals:["if","would have","had + V3"],
  examples:[
    { en:"If I had studied, I would have passed.", vi:"Nếu tôi đã học, tôi đã đậu (nhưng tôi đã không học)." },
    { en:"If she had left earlier, she wouldn't have missed the train.", vi:"Nếu cô ấy rời đi sớm hơn, cô ấy đã không lỡ tàu." },
    { en:"We would have won if we had played better.", vi:"Chúng tôi đã thắng nếu chơi tốt hơn." }
  ],
  practice:[
    { type:'conj', q:"If I ___ (study), I would have passed.", answer:"had studied", alts:[], explain:"Vế If loại 3: had + V3 (study → studied)." },
    { type:'conj', q:"If she had left earlier, she ___ (not / miss) the train.", answer:"would not have missed", alts:["wouldn't have missed"], explain:"Vế chính phủ định: would not have + V3 (miss → missed)." },
    { type:'conj', q:"We ___ (win) if we had played better.", answer:"would have won", alts:["'d have won"], explain:"Vế chính loại 3: would have + V3 (win → won)." },
    { type:'mc', q:"Câu điều kiện loại 3 nói về điều gì?", options:["Sự thật hiển nhiên","Tương lai có thể xảy ra","Giả định trái với quá khứ (tiếc nuối)","Thói quen hiện tại"], answer:2, explain:"Loại 3 giả định trái với quá khứ." },
    { type:'mc', q:"Chọn câu ĐÚNG (điều kiện loại 3):", options:["If I had studied, I would pass.","If I studied, I would have passed.","If I had studied, I would have passed.","If I have studied, I would have passed."], answer:2, explain:"Loại 3: If + had + V3, vế chính + would have + V3." }
  ]
},
/* ===================== CÂU BỊ ĐỘNG ===================== */
{
  id:'passive-voice', group:'passive', name:'Câu bị động', en:'Passive Voice', tag:'BĐ',
  forms:[
    { l:'Chủ động', t:'S + V + O' },
    { l:'Bị động', t:'O + be (chia theo thì) + V3 (+ by + S)' },
    { l:'Lưu ý', t:'"be" chia theo thì của câu chủ động; động từ chính → V3.' }
  ],
  usage:[
    "Nhấn mạnh đối tượng bị tác động thay vì người thực hiện.",
    "Khi không biết hoặc không cần nêu người thực hiện.",
    "Văn phong trang trọng, khoa học, tin tức."
  ],
  signals:["by + tân ngữ","được","bị"],
  examples:[
    { en:"English is spoken in many countries.", vi:"Tiếng Anh được nói ở nhiều nước. (Hiện tại đơn)" },
    { en:"The house was built in 1990.", vi:"Ngôi nhà được xây năm 1990. (Quá khứ đơn)" },
    { en:"The work has been done.", vi:"Công việc đã được hoàn thành. (Hiện tại hoàn thành)" },
    { en:"The report will be finished tomorrow.", vi:"Bản báo cáo sẽ được hoàn thành ngày mai. (Tương lai)" },
    { en:"The road is being repaired.", vi:"Con đường đang được sửa. (Hiện tại tiếp diễn)" }
  ],
  practice:[
    { type:'conj', q:"English ___ (speak) in many countries.", answer:"is spoken", alts:[], explain:"Bị động Hiện tại đơn: is/are + V3 (speak → spoken)." },
    { type:'conj', q:"The house ___ (build) in 1990.", answer:"was built", alts:[], explain:"Bị động Quá khứ đơn: was/were + V3 (build → built)." },
    { type:'conj', q:"The report will ___ (finish) tomorrow.", answer:"be finished", alts:[], explain:"Bị động tương lai: will + be + V3 (finish → finished)." },
    { type:'conj', q:"The work has ___ (do) already.", answer:"been done", alts:[], explain:"Bị động Hiện tại hoàn thành: have/has + been + V3 (do → done)." },
    { type:'conj', q:"The road ___ (repair) right now.", answer:"is being repaired", alts:[], explain:"Bị động Hiện tại tiếp diễn: is/are + being + V3." },
    { type:'mc', q:'Đổi sang bị động: "They clean the room every day."', options:["The room cleans every day.","The room is cleaned every day.","The room is cleaning every day.","The room was cleaned every day."], answer:1, explain:"Hiện tại đơn bị động: is/are + V3 (clean → cleaned)." },
    { type:'mc', q:"Cấu trúc cơ bản của câu bị động là gì?", options:["S + be + V-ing","S + have + V3","S + be + V3","S + will + V"], answer:2, explain:"Bị động = be (chia theo thì) + V3 (quá khứ phân từ)." }
  ]
},
/* ===================== CÂU TƯỜNG THUẬT ===================== */
{
  id:'reported-speech', group:'reported', name:'Câu tường thuật', en:'Reported Speech', tag:'TT',
  forms:[
    { l:'Câu kể', t:'S + said (that) + S + V(lùi thì)' },
    { l:'Câu hỏi Yes/No', t:'S + asked + if/whether + S + V(lùi thì)' },
    { l:'Câu mệnh lệnh', t:'S + told + O + (not) to + V(nguyên)' }
  ],
  usage:[
    "Thuật lại lời người khác nói (không dùng dấu ngoặc kép).",
    "Lùi thì 1 bậc: hiện tại → quá khứ, quá khứ → quá khứ hoàn thành, will → would.",
    "Đổi đại từ và trạng từ: now→then, today→that day, here→there, this→that, yesterday→the day before, tomorrow→the next day."
  ],
  signals:["said","told","asked","that","if / whether"],
  examples:[
    { en:'"I am tired." → She said (that) she was tired.', vi:"Cô ấy nói rằng cô ấy mệt." },
    { en:'"I will call you." → He said he would call me.', vi:"Anh ấy nói sẽ gọi cho tôi." },
    { en:'"Do you like coffee?" → She asked if I liked coffee.', vi:"Cô ấy hỏi tôi có thích cà phê không." },
    { en:'"Close the door." → He told me to close the door.', vi:"Anh ấy bảo tôi đóng cửa." }
  ],
  practice:[
    { type:'mc', q:'Direct: "I am busy." → Reported: She said she ___ busy.', options:["is","was","were","has been"], answer:1, explain:"Lùi thì: am/is → was." },
    { type:'mc', q:'Direct: "I will help you." → He said he ___ help me.', options:["will","would","will be","would have"], answer:1, explain:"will → would." },
    { type:'mc', q:'Direct: "Do you speak English?" → She asked ___ I spoke English.', options:["that","if","what","to"], answer:1, explain:"Câu hỏi Yes/No → asked + if/whether." },
    { type:'mc', q:'Direct: "Close the door." → He told me ___ the door.', options:["close","to close","closing","closed"], answer:1, explain:"Câu mệnh lệnh → told + O + to + V nguyên." },
    { type:'mc', q:'Direct: "I saw him yesterday." → He said he had seen him ___.', options:["yesterday","the day before","tomorrow","now"], answer:1, explain:"yesterday → the day before." },
    { type:'mc', q:'Lùi thì: câu "I work here" trong câu tường thuật thành gì?', options:["I work here","I worked here","I had worked here","I am working here"], answer:1, explain:"Hiện tại đơn → Quá khứ đơn." },
    { type:'mc', q:'Direct: "I like this book." → She said she liked ___ book.', options:["this","that","these","a"], answer:1, explain:"this → that trong câu tường thuật." }
  ]
},
/* ===================== SO SÁNH ===================== */
{
  id:'comparison', group:'comparison', name:'So sánh (hơn · nhất · bằng)', en:'Comparatives & Superlatives', tag:'SS',
  forms:[
    { l:'So sánh bằng', t:'S + V + as + adj/adv + as ...' },
    { l:'So sánh hơn', t:'Ngắn: adj-er + than | Dài: more + adj + than' },
    { l:'So sánh nhất', t:'Ngắn: the + adj-est | Dài: the most + adj' }
  ],
  usage:[
    "So sánh 2 hay nhiều người/vật.",
    "Tính từ NGẮN (1 âm tiết) + -er / -est.",
    "Tính từ DÀI (2+ âm tiết) dùng more / most.",
    "Bất quy tắc: good→better→best, bad→worse→worst, far→farther/further→farthest, many/much→more→most, little→less→least."
  ],
  signals:["than","as ... as","the most","-er","-est"],
  examples:[
    { en:"She is taller than me.", vi:"Cô ấy cao hơn tôi." },
    { en:"This book is more interesting than that one.", vi:"Cuốn sách này thú vị hơn cuốn kia." },
    { en:"He is the tallest boy in the class.", vi:"Cậu ấy là cậu bé cao nhất lớp." },
    { en:"Today is as hot as yesterday.", vi:"Hôm nay nóng bằng hôm qua." },
    { en:"This is the most expensive car here.", vi:"Đây là chiếc xe đắt nhất ở đây." }
  ],
  practice:[
    { type:'conj', q:"She is ___ (tall) than me.", answer:"taller", alts:[], explain:"Tính từ ngắn: adj + -er + than (tall → taller)." },
    { type:'conj', q:"This book is ___ (interesting) than that one.", answer:"more interesting", alts:[], explain:"Tính từ dài: more + adj + than." },
    { type:'conj', q:"He is the ___ (tall) boy in the class.", answer:"tallest", alts:[], explain:"So sánh nhất tính từ ngắn: the + adj-est (tall → tallest)." },
    { type:'conj', q:"This is the ___ (expensive) car here.", answer:"most expensive", alts:[], explain:"So sánh nhất tính từ dài: the most + adj." },
    { type:'conj', q:"My grades are ___ (good) than yours.", answer:"better", alts:[], explain:"good là bất quy tắc: good → better → best." },
    { type:'conj', q:"Today is as ___ (hot) as yesterday.", answer:"hot", alts:[], explain:"So sánh bằng: as + adj nguyên + as." },
    { type:'mc', q:"So sánh hơn của 'good' là gì?", options:["gooder","more good","better","best"], answer:2, explain:"good → better (so sánh hơn) → best (so sánh nhất)." },
    { type:'mc', q:"Chọn câu ĐÚNG:", options:["She is more tall than me.","She is taller than me.","She is tallest than me.","She is as taller as me."], answer:1, explain:"Tính từ ngắn 'tall' → taller than." }
  ]
}
];
