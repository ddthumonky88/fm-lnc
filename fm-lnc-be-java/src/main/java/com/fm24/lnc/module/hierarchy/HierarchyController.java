package com.fm24.lnc.module.hierarchy;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hierarchy")
public class HierarchyController {
  private static final List<String> CONFEDS=List.of("AFC","CAF","CONCACAF","CONMEBOL","OFC","UEFA");
  private final JdbcTemplate jdbc;
  public HierarchyController(JdbcTemplate jdbc){this.jdbc=jdbc;}

  @GetMapping("/list-confederations")
  public List<Map<String,Object>> confederations(){
    List<Map<String,Object>> result=new ArrayList<>();
    for(String code:List.of("CAF","AFC","UEFA","CONCACAF","OFC","CONMEBOL","WORLD","EXTINCT")){
      Integer nations=jdbc.queryForObject("SELECT COUNT(*) FROM nations WHERE confed=?",Integer.class,code);
      Integer comps=jdbc.queryForObject("SELECT COUNT(*) FROM competitions WHERE confed=? AND nation_id IS NULL",Integer.class,code);
      result.add(Map.of("id",code,"name",code,"code",code,"stats",Map.of("nations",nations,"intComps",comps)));
    } return result;
  }

  @GetMapping({"/tree","/unit-tree"})
  public List<Map<String,Object>> tree(@RequestParam(defaultValue="default") String type){
    List<Map<String,Object>> roots=new ArrayList<>(); roots.add(node("all","ALL","ALL","",1,true,List.of()));
    if(type.equalsIgnoreCase("comp")||type.equalsIgnoreCase("competition")) roots.add(node("world","[WORLD] World","WORLD","World",1,true,List.of()));
    if(type.equalsIgnoreCase("nation")){
      for(String c:CONFEDS) roots.add(node(c.toLowerCase(),"["+c+"] "+confedName(c),c,confedName(c),1,true,List.of()));
      roots.add(node("extinct","[EXT] Extinct","EXT","Extinct",1,true,List.of())); return roots;
    }
    for(String confed:CONFEDS){
      List<Map<String,Object>> nations=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,confed FROM nations WHERE confed=? ORDER BY COALESCE(name_sh,name_lg)",confed);
      List<Map<String,Object>> children=new ArrayList<>();
      if(type.equalsIgnoreCase("comp")||type.equalsIgnoreCase("competition")) children.add(special("intl_"+confed.toLowerCase(),"INT","International",confed));
      for(Map<String,Object> nation:nations){
        String id=String.valueOf(nation.get("id")); String key=type.equalsIgnoreCase("club")?"nation_"+id:id;
        List<Map<String,Object>> sub=new ArrayList<>();
        if(type.equalsIgnoreCase("club")){
          for(Map<String,Object> comp:jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,nation_id FROM competitions WHERE nation_id=? AND parent_id IS NULL ORDER BY COALESCE(name_sh,name_lg)",id))
            sub.add(node("comp_"+comp.get("id"),text(comp.get("name_sh"),comp.get("name_lg")),text(comp.get("name_3l"),"CMP"),text(comp.get("name_sh"),comp.get("name_lg")),3,true,List.of()));
          sub.add(special("oth_"+id,"OTH","Other",confed)); sub.add(special("ext_"+id,"EXT","Extinct",confed));
        }
        Map<String,Object> n=node(key,text(nation.get("name_sh"),nation.get("name_lg")),text(nation.get("name_3l"),"---"),text(nation.get("name_sh"),nation.get("name_lg")),2,true,sub);
        n.put("confed",confed); n.put("nationData",nation); children.add(n);
      }
      roots.add(node(confed.toLowerCase(),"["+confed+"] "+confedName(confed),confed,confedName(confed),1,true,children));
    } return roots;
  }

  @PostMapping("/nations/search") public Map<String,Object> nations(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("nations",merge(q,f),"COALESCE(name_sh,name_lg)");}
  @PostMapping("/int-competitions/search") public Map<String,Object> intComps(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return pageSql("competitions",merge(q,f),"nation_id IS NULL AND parent_id IS NULL","COALESCE(name_sh,name_lg)");}
  @PostMapping("/domestic-competitions/search") public Map<String,Object> domestic(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return pageSql("competitions",merge(q,f),"nation_id IS NOT NULL","COALESCE(name_sh,name_lg)");}
  @PostMapping("/club/search") public Map<String,Object> clubs(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("clubs",merge(q,f),"LENGTH(id), id");}
  @PostMapping("/stadiums/search") public Map<String,Object> stadiums(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("stadiums",merge(q,f),"name");}
  @PostMapping("/cities/search") public Map<String,Object> cities(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("cities",merge(q,f),"name");}
  @PostMapping({"/awards/search","/awards"}) public Map<String,Object> awards(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("awards",merge(q,f),"COALESCE(name_sh,name_lg)");}
  @PostMapping("/players") public Map<String,Object> players(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("people",merge(q,f),"CONCAT_WS(' ',first_name,common_name,second_name)");}

  @GetMapping("/regions") public List<Map<String,Object>> regions(){return jdbc.queryForList("SELECT r.*,COUNT(c.id)::int cities_count FROM regions r LEFT JOIN cities c ON c.region_id=r.id GROUP BY r.id ORDER BY r.name");}
  @PostMapping("/regions/search") public Map<String,Object> regionSearch(@RequestBody(required=false) Map<String,Object> f){return page("regions",f,"name");}
  @GetMapping("/nations/{nationId}/regions") public List<Map<String,Object>> nationRegions(@PathVariable String nationId){return jdbc.queryForList("SELECT r.*,COUNT(c.id)::int cities_count FROM regions r LEFT JOIN cities c ON c.region_id=r.id WHERE r.nation_id=? GROUP BY r.id ORDER BY r.name",nationId);}
  @GetMapping("/competitions/{compId}/awards") public List<Map<String,Object>> compAwards(@PathVariable String compId){return jdbc.queryForList("SELECT * FROM awards WHERE comp_id=? ORDER BY COALESCE(name_sh,name_lg)",compId);}
  @PostMapping("/competitions/{id}/sub-competitions") public Map<String,Object> subComps(@PathVariable String id,@RequestBody(required=false) Map<String,Object> f){Map<String,Object> filter=f==null?new LinkedHashMap<>():new LinkedHashMap<>(f);filter.put("parentId",id);return page("competitions",filter,"COALESCE(name_sh,name_lg)");}

  @GetMapping({"/nations/{id}/info","/nations/{id}/hub"}) public Map<String,Object> nationInfo(@PathVariable String id){return info("nations",id);}
  @GetMapping("/clubs/{id}/info")
  public Map<String,Object> clubInfo(@PathVariable String id){
    Map<String,Object> club=new LinkedHashMap<>(info("clubs",id));
    Object nationId=club.get("nation_id");
    if(nationId!=null){
      List<Map<String,Object>> nations=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,confed FROM nations WHERE id::text=?",String.valueOf(nationId));
      if(!nations.isEmpty()){
        Map<String,Object> nation=nations.get(0);
        club.put("nation",nation);
        club.put("nation_name",text(nation.get("name_lg"),nation.get("name_sh")));
        club.put("nation_three_letter",nation.get("name_3l"));
      }
    }
    Object compId=club.get("comp_id");
    if(compId!=null){
      List<Map<String,Object>> comps=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,nation_id FROM competitions WHERE id::text=?",String.valueOf(compId));
      if(!comps.isEmpty()){
        Map<String,Object> comp=comps.get(0);
        club.put("comp",comp);
        club.put("competition",comp);
        club.put("competition_name",text(comp.get("name_lg"),comp.get("name_sh")));
        club.put("comp_name",text(comp.get("name_sh"),comp.get("name_lg")));
      }
    }
    return club;
  }
  @GetMapping("/clubs/{id}/affiliates") public List<Map<String,Object>> affiliates(@PathVariable String id){return jdbc.queryForList("SELECT * FROM clubs WHERE affiliate_club_id=?",id);}
  @GetMapping("/cities/{id}/info") public Map<String,Object> cityInfo(@PathVariable String id){return info("cities",id);}
  @GetMapping("/awards/{id}/info") public Map<String,Object> awardInfo(@PathVariable String id){return info("awards",id);}
  @GetMapping("/stadiums/{id}/info") public Map<String,Object> stadiumInfo(@PathVariable String id){return info("stadiums",id);}
  @GetMapping("/regions/{id}/info") public Map<String,Object> regionInfo(@PathVariable String id){return info("regions",id);}
  @GetMapping("/competitions/{id}/info") public Map<String,Object> compInfo(@PathVariable String id){return info("competitions",id);}
  @GetMapping("/continents/{id}/info") public Map<String,Object> continentInfo(@PathVariable String id){return Map.of("id",id,"name",confedName(id.toUpperCase()),"nationsCount",jdbc.queryForObject("SELECT COUNT(*) FROM nations WHERE confed=?",Integer.class,id.toUpperCase()));}

  private Map<String,Object> page(String table,Map<String,Object> f,String order){return pageSql(table,f,"TRUE",order);}
  private Map<String,Object> pageSql(String table,Map<String,Object> input,String base,String order){
    Map<String,Object> f=input==null?Map.of():input; int page=num(f.get("page"),0),size=Math.min(num(f.get("size"),20),300); List<Object> args=new ArrayList<>();
    StringBuilder where=new StringBuilder(base); add(where,args,f,"nationId","nation_id"); add(where,args,f,"compId","comp_id"); add(where,args,f,"parentId","parent_id"); add(where,args,f,"regionId","region_id"); add(where,args,f,"type","type");
    Object confed=f.get("confedId");if(confed!=null&&!String.valueOf(confed).equalsIgnoreCase("all")){where.append(" AND confed=?");args.add(String.valueOf(confed).toUpperCase());}
    String search=searchExpression(table);
    Object keyword=f.get("keyword");if(keyword!=null&&!String.valueOf(keyword).isBlank()){where.append(" AND (id::text ILIKE ? OR ").append(search).append(" ILIKE ?)");args.add("%"+keyword+"%");args.add("%"+keyword+"%");}
    Integer total=jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE "+where,Integer.class,args.toArray()); List<Object> queryArgs=new ArrayList<>(args);queryArgs.add(size);queryArgs.add(page*size);
    List<Map<String,Object>> content=jdbc.queryForList("SELECT * FROM "+table+" WHERE "+where+" ORDER BY "+order+" LIMIT ? OFFSET ?",queryArgs.toArray()); int pages=(int)Math.ceil((total==null?0:total)/(double)size);
    return Map.of("content",content,"page",page,"size",size,"totalElements",total==null?0:total,"totalPages",pages,"first",page==0,"last",page+1>=pages,"hasPrevious",page>0,"hasNext",page+1<pages);
  }
  private Map<String,Object> info(String table,String id){return jdbc.queryForMap("SELECT * FROM "+table+" WHERE id::text=?",id);}
  private String searchExpression(String table){return switch(table){case "nations","competitions","clubs","awards"->"COALESCE(name_sh,name_lg)";case "people"->"CONCAT_WS(' ',first_name,common_name,second_name)";default->"name";};}
  private void add(StringBuilder w,List<Object>a,Map<String,Object>f,String key,String col){Object v=f.get(key);if(v!=null&&!String.valueOf(v).isBlank()){w.append(" AND ").append(col).append("::text=?");a.add(v);}}
  private Map<String,Object> merge(Map<String,String> query,Map<String,Object> body){Map<String,Object> out=new LinkedHashMap<>();if(body!=null)out.putAll(body);if(query!=null)out.putAll(query);return out;}
  private int num(Object value,int fallback){if(value instanceof Number n)return n.intValue();if(value!=null)try{return Integer.parseInt(String.valueOf(value));}catch(NumberFormatException ignored){}return fallback;}
  private String text(Object a,Object b){String x=a==null?"":String.valueOf(a);return x.isBlank()?String.valueOf(b):x;}
  private String confedName(String c){return Map.of("AFC","Asia","CAF","Africa","CONCACAF","North America","CONMEBOL","South America","OFC","Oceania","UEFA","Europe","WORLD","World","EXTINCT","Extinct").getOrDefault(c,c);}
  private Map<String,Object> special(String key,String code,String name,String confed){Map<String,Object> n=node(key,"["+code+"] "+name,code,name,2,true,List.of());n.put("confed",confed);return n;}
  private Map<String,Object> node(String key,String title,String code,String shortName,int level,boolean selectable,List<Map<String,Object>> children){Map<String,Object> n=new LinkedHashMap<>();n.put("key",key);n.put("title",title);n.put("code3",code);n.put("shortName",shortName);n.put("level",level);n.put("selectable",selectable);n.put("isLeaf",children.isEmpty());if(!children.isEmpty())n.put("children",children);return n;}
}
