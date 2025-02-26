from supabase import create_client,Client
from bs4 import BeautifulSoup
import requests
import pandas as pd
import lxml
from fastapi import HTTPException,status
import json
from api.models.course import CourseBase
from api.utils.logger import setup_logger
from api.core.config import get_settings


class AuthCourse:
    def __init__(self):
        settings=get_settings()
        self.client:Client=create_client(
            settings.SUPABASE_URL,settings.SUPABASE_KEY)
        self.logger=setup_logger("auth_course_logger","auth_course_logger.log")
    
    def course_crawler(self,url)->pd.DataFrame:
        try:
            self.logger.info("creep the courselist")
            response=requests.get(url)
            if response.status_code==200:
                html_content=response.text
                soup=BeautifulSoup(html_content,'lxml')
                table=soup.find('table')
                headers=[]
                for th in table.find_all('th'):
                    if th.text not in headers:
                        headers.append(th.text)
                data=[]
                for row in table.find_all('tr'):
                    rowData=[]
                    for td in row.find_all('td'):
                        rowData.append(td.text)
                    if rowData and len(rowData)>2:
                        data.append(rowData)
                df=pd.DataFrame(data,columns=headers)
                return df
        
            else:
                self.logger.error(f"Cannot patch data")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cannot connect the data"
                )

        except Exception as e:
            self.logger.error("Cannot connected the data")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
                
    def rearrange_dataframe(self,dataframe)->list:
        try:
            js=dataframe.to_json(orient='records')
            js_up=json.loads(js)
            self.logger.info("Turn to json")
            return js_up
        except Exception as e:
            self.logger.error("Fail to Turn the data")
    
    def upload_course_to_supabase(self,data:list,coursename:str="course"):
        try:
            response=(self.supabase.table(course).insert(data).execute())
            self.logger.info("Upload to supabase")
        except Exception as e:
            self.logger.error("Fail to upload the data")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    def output_form_course(self)->list[CourseBase]:
        df = self.course_crawler(url="https://ece.uwaterloo.ca/~jabarby/grad_course_offering.html")
        temper_form=self.rearrange_dataframe(df)
        course_return_list=[]
        for dic in range(len(temper_form)):
            temp_return=CourseBase()
            temp_return.term=temper_form[dic]["Term"]
            temp_return.task=temper_form[dic]["Task"]
            temp_return.title=temper_form[dic]["Title"]
            temp_return.name=temper_form[dic]["Name"]
            self.logger.info(temp_return)
            course_return_list.append(temp_return)
        return course_return_list
    

            

